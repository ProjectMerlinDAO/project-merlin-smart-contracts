// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./FinalistList.sol";

contract FinalistVoting is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Finalist voting phase constants
    uint256 public constant PROJECTS_PER_FINALIST_LIST = 3;
    uint256 public constant FINALIST_LIST_COUNT = 3;
    uint256 public constant PROJECTS_IN_FINAL = 9;
    uint256 public constant FINALISTS_PER_LIST_TIER_1 = 2;
    uint256 public constant FINALISTS_PER_LIST_TIER_2 = 3;
    uint256 public constant FINALISTS_PER_LIST_TIER_3 = 4;
    
    mapping(uint256 => mapping(address => address)) public finalistVotingRounds; // roundId -> voter -> FinalistList
    mapping(uint256 => bool) public finalistVotingStarted;
    mapping(uint256 => bool) public finalistVotingEnded;
    mapping(uint256 => string[]) public roundWinners; // roundId -> winning projects
    
    // For vote counting
    mapping(uint256 => mapping(string => uint256)) public projectVoteCounts; // roundId -> projectId -> vote count

    event FinalistVotingStarted(uint256 indexed roundId, uint256 timestamp);
    event FinalistVotingEnded(uint256 indexed roundId, uint256 timestamp);
    event WinnersSelected(uint256 indexed roundId, string[] winners);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function startFinalistVoting(
        uint256 roundId,
        address[] memory activeVoters,
        string[][] memory finalistLists
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(!finalistVotingStarted[roundId], "Finalist voting already started");
        require(finalistLists.length == FINALIST_LIST_COUNT, "Invalid number of finalist lists");
        require(activeVoters.length > 0, "No active voters found");

        uint256 votersPerList = activeVoters.length / FINALIST_LIST_COUNT;
        uint256 remainder = activeVoters.length % FINALIST_LIST_COUNT;
        uint256 voterIndex = 0;

        for (uint256 listType = 0; listType < FINALIST_LIST_COUNT; listType++) {
            uint256 votersForThisType = votersPerList;
            if (listType < remainder) {
                votersForThisType++;
            }

            for (uint256 i = 0; i < votersForThisType && voterIndex < activeVoters.length; i++) {
                address voter = activeVoters[voterIndex];

                FinalistList finalistList = new FinalistList(
                    address(this),
                    roundId,
                    finalistLists[listType],
                    voter,
                    listType
                );

                finalistVotingRounds[roundId][voter] = address(finalistList);
                voterIndex++;
            }
        }

        finalistVotingStarted[roundId] = true;
        emit FinalistVotingStarted(roundId, block.timestamp);
    }

    function submitFinalistVote(uint256 roundId, string[] calldata topProjects) external whenNotPaused {
        require(finalistVotingStarted[roundId], "Finalist voting not started");
        require(!finalistVotingEnded[roundId], "Finalist voting ended");
        
        address finalistListAddr = finalistVotingRounds[roundId][msg.sender];
        require(finalistListAddr != address(0), "Not authorized to vote in finalist phase");
        
        FinalistList finalistList = FinalistList(finalistListAddr);
        require(finalistList.owner() == msg.sender, "Not the owner of finalist list");
        
        finalistList.vote(topProjects);
    }

    function endFinalistVoting(uint256 roundId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(finalistVotingStarted[roundId], "Finalist voting not started");
        require(!finalistVotingEnded[roundId], "Finalist voting already ended");

        string[] memory winners = new string[](FINALIST_LIST_COUNT);
        
        for (uint256 listType = 0; listType < FINALIST_LIST_COUNT; listType++) {
            string memory winningProject = "";
            uint256 maxVotes = 0;

            // Find the winning project for this list type
            for (uint256 i = 0; i < PROJECTS_PER_FINALIST_LIST; i++) {
                string memory projectId = getProjectAtIndex(roundId, listType, i);
                if (bytes(projectId).length > 0) {
                    uint256 voteCount = projectVoteCounts[roundId][projectId];
                    if (voteCount > maxVotes) {
                        maxVotes = voteCount;
                        winningProject = projectId;
                    }
                }
            }

            winners[listType] = winningProject;
        }

        roundWinners[roundId] = winners;
        finalistVotingEnded[roundId] = true;

        emit FinalistVotingEnded(roundId, block.timestamp);
        emit WinnersSelected(roundId, winners);
    }

    function getFinalistVotingList(uint256 roundId, address voter) external view returns (address) {
        return finalistVotingRounds[roundId][voter];
    }

    function getRoundWinners(uint256 roundId) external view returns (string[] memory) {
        require(finalistVotingEnded[roundId], "Finalist voting not ended yet");
        return roundWinners[roundId];
    }

    function getProjectAtIndex(
        uint256 roundId,
        uint256 listType,
        uint256 index
    ) internal view returns (string memory) {
        address voterWithList = findVoterWithListType(roundId, listType);
        if (voterWithList == address(0)) return "";

        FinalistList finalistList = FinalistList(finalistVotingRounds[roundId][voterWithList]);
        string[] memory projects = finalistList.getAllAvailableProjects();
        
        if (index >= projects.length) return "";
        return projects[index];
    }

    function findVoterWithListType(
        uint256 roundId,
        uint256 targetListType
    ) internal view returns (address) {
        // Iterate through all finalist voting rounds to find a voter with this list type
        for (uint256 i = 0; i < PROJECTS_IN_FINAL; i++) {
            address voter = address(uint160(i)); // Convert index to address for iteration
            address finalistListAddr = finalistVotingRounds[roundId][voter];
            
            if (finalistListAddr != address(0)) {
                FinalistList finalistList = FinalistList(finalistListAddr);
                if (finalistList.finalistListType() == targetListType) {
                    return voter;
                }
            }
        }
        return address(0);
    }
} 