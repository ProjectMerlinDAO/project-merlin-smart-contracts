// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./FinalistList.sol";

/**
 * @title FinalistVoting
 * @dev Contract for managing the finalist voting phase in Project Merlin's DAO
 *
 * This contract manages:
 * - Finalist voting rounds
 * - Vote distribution and counting
 * - Winner selection
 * - Voter list assignments
 *
 * Security considerations:
 * - Role-based access control
 * - Protected against reentrancy
 * - Pausable for emergency situations
 * - Protected state transitions
 * - Secure vote counting
 */
contract FinalistVoting is AccessControl, ReentrancyGuard, Pausable {
    // Access control roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Finalist voting phase constants
    uint256 public constant PROJECTS_PER_FINALIST_LIST = 3;
    uint256 public constant FINALIST_LIST_COUNT = 3;
    uint256 public constant PROJECTS_IN_FINAL = 9;
    uint256 public constant FINALISTS_PER_LIST_TIER_1 = 2;
    uint256 public constant FINALISTS_PER_LIST_TIER_2 = 3;
    uint256 public constant FINALISTS_PER_LIST_TIER_3 = 4;
    
    // State variables
    mapping(uint256 => mapping(address => address)) public finalistVotingRounds; // roundId -> voter -> FinalistList
    mapping(uint256 => address[]) public roundVoters; // roundId -> array of voters
    mapping(uint256 => bool) public finalistVotingStarted;
    mapping(uint256 => bool) public finalistVotingEnded;
    mapping(uint256 => string[]) public roundWinners; // roundId -> winning projects
    mapping(uint256 => mapping(string => uint256)) public projectVoteCounts; // roundId -> projectId -> vote count

    // Events
    event FinalistVotingStarted(uint256 indexed roundId, uint256 timestamp);
    event FinalistVotingEnded(uint256 indexed roundId, uint256 timestamp);
    event WinnersSelected(uint256 indexed roundId, string[] winners);
    event FinalistListCreated(uint256 indexed roundId, address indexed voter, uint256 listType);
    event VoteSubmitted(uint256 indexed roundId, address indexed voter, uint256 listType);

    /**
     * @dev Constructor sets up initial admin roles
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Starts the finalist voting phase for a round
     * @param roundId ID of the voting round
     * @param activeVoters Array of active voter addresses
     * @param finalistLists Array of finalist project lists
     *
     * Security:
     * - Only admin can call
     * - Validates input parameters
     * - Protected state updates
     * - Even distribution of voters
     */
    function startFinalistVoting(
        uint256 roundId,
        address[] memory activeVoters,
        string[][] memory finalistLists
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(!finalistVotingStarted[roundId], "Finalist voting already started");
        require(finalistLists.length == FINALIST_LIST_COUNT, "Invalid number of finalist lists");
        require(activeVoters.length > 0, "No active voters found");

        // Filter out zero addresses from active voters
        uint256 validVoterCount = 0;
        for (uint256 i = 0; i < activeVoters.length; i++) {
            if (activeVoters[i] != address(0)) {
                validVoterCount++;
            }
        }
        require(validVoterCount > 0, "No valid voters found");

        uint256 votersPerList = validVoterCount / FINALIST_LIST_COUNT;
        uint256 remainder = validVoterCount % FINALIST_LIST_COUNT;
        uint256 voterIndex = 0;

        // Initialize roundVoters array
        delete roundVoters[roundId];

        for (uint256 listType = 0; listType < FINALIST_LIST_COUNT; listType++) {
            require(finalistLists[listType].length <= PROJECTS_PER_FINALIST_LIST, "Too many projects in list");
            
            uint256 votersForThisType = votersPerList;
            if (listType < remainder) {
                votersForThisType++;
            }

            for (uint256 i = 0; i < votersForThisType && voterIndex < activeVoters.length; i++) {
                address voter = activeVoters[voterIndex];
                if (voter != address(0)) {
                    FinalistList finalistList = new FinalistList(
                        address(this),
                        roundId,
                        finalistLists[listType],
                        voter,
                        listType
                    );

                    finalistVotingRounds[roundId][voter] = address(finalistList);
                    roundVoters[roundId].push(voter);
                    emit FinalistListCreated(roundId, voter, listType);
                    voterIndex++;
                }
            }
        }

        finalistVotingStarted[roundId] = true;
        emit FinalistVotingStarted(roundId, block.timestamp);
    }

    /**
     * @dev Submits votes for finalist projects
     * @param roundId ID of the voting round
     * @param topProjects Array of selected project IDs
     *
     * Security:
     * - Validates voting phase state
     * - Validates voter authorization
     * - Protected vote submission
     */
    function submitFinalistVote(uint256 roundId, string[] calldata topProjects) external {
        require(finalistVotingStarted[roundId], "Finalist voting not started");
        require(!finalistVotingEnded[roundId], "Finalist voting ended");
        
        address finalistListAddr = finalistVotingRounds[roundId][msg.sender];
        require(finalistListAddr != address(0), "Not authorized to vote in finalist phase");
        
        FinalistList finalistList = FinalistList(finalistListAddr);
        require(finalistList.owner() == msg.sender, "Not the owner of finalist list");
        
        // Record votes for each project
        for (uint256 i = 0; i < topProjects.length; i++) {
            projectVoteCounts[roundId][topProjects[i]]++;
        }
        
        finalistList.vote(topProjects);
        emit VoteSubmitted(roundId, msg.sender, finalistList.finalistListType());
    }

    /**
     * @dev Ends the finalist voting phase and selects winners
     * @param roundId ID of the voting round
     *
     * Security:
     * - Only admin can call
     * - Validates voting phase state
     * - Protected winner selection
     * - Safe state transitions
     */
    function endFinalistVoting(uint256 roundId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(finalistVotingStarted[roundId], "Finalist voting not started");
        require(!finalistVotingEnded[roundId], "Finalist voting already ended");

        string[] memory winners = new string[](FINALIST_LIST_COUNT);
        uint256 winnerCount = 0;
        
        for (uint256 listType = 0; listType < FINALIST_LIST_COUNT; listType++) {
            string memory winningProject = "";
            uint256 maxVotes = 0;

            // Find the winning project for this list type
            for (uint256 i = 0; i < PROJECTS_PER_FINALIST_LIST; i++) {
                string memory projectId = getProjectAtIndex(roundId, listType, i);
                if (bytes(projectId).length > 0) {
                    uint256 voteCount = projectVoteCounts[roundId][projectId];
                    if (voteCount >= maxVotes) {
                        maxVotes = voteCount;
                        winningProject = projectId;
                    }
                }
            }

            if (bytes(winningProject).length > 0) {
                winners[winnerCount] = winningProject;
                winnerCount++;
            }
        }

        require(winnerCount > 0, "No winners found");
        
        // Resize winners array to actual count
        string[] memory finalWinners = new string[](winnerCount);
        for (uint256 i = 0; i < winnerCount; i++) {
            finalWinners[i] = winners[i];
        }

        roundWinners[roundId] = finalWinners;
        finalistVotingEnded[roundId] = true;

        emit FinalistVotingEnded(roundId, block.timestamp);
        emit WinnersSelected(roundId, finalWinners);
    }

    /**
     * @dev Returns the finalist voting list address for a voter
     * @param roundId ID of the voting round
     * @param voter Address of the voter
     * @return Address of the voter's finalist list
     */
    function getFinalistVotingList(uint256 roundId, address voter) external view returns (address) {
        require(voter != address(0), "Invalid voter address");
        return finalistVotingRounds[roundId][voter];
    }

    /**
     * @dev Returns the winning projects for a round
     * @param roundId ID of the voting round
     * @return Array of winning project IDs
     */
    function getRoundWinners(uint256 roundId) external view returns (string[] memory) {
        require(finalistVotingEnded[roundId], "Finalist voting not ended yet");
        return roundWinners[roundId];
    }

    /**
     * @dev Gets a project ID at a specific index in a list type
     * @param roundId ID of the voting round
     * @param listType Type of finalist list
     * @param index Index in the list
     * @return Project ID at the specified index
     */
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

    /**
     * @dev Finds a voter with a specific list type
     * @param roundId ID of the voting round
     * @param targetListType Type of list to find
     * @return Address of a voter with the specified list type
     */
    function findVoterWithListType(
        uint256 roundId,
        uint256 targetListType
    ) internal view returns (address) {
        require(targetListType < FINALIST_LIST_COUNT, "Invalid list type");

        address[] memory voters = roundVoters[roundId];
        for (uint256 i = 0; i < voters.length; i++) {
            address voter = voters[i];
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