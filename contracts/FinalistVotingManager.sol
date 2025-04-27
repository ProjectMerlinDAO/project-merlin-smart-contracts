// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ProposalList.sol";
import "./FinalistVoting.sol";
import "./FinalistVotingLib.sol";

contract FinalistVotingManager is AccessControl {
    using FinalistVotingLib for FinalistVotingLib.VotingState;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    
    uint256 public constant PROJECTS_PER_LIST_TYPE = 5;
    uint256 public constant LIST_TYPES_THRESHOLD_1 = 20;
    uint256 public constant LIST_TYPES_THRESHOLD_2 = 50;
    uint256 public constant LIST_TYPES_THRESHOLD_3 = 100;
    uint256 public constant FINALISTS_PER_LIST_TIER_1 = 2;
    uint256 public constant FINALISTS_PER_LIST_TIER_2 = 3;
    uint256 public constant FINALISTS_PER_LIST_TIER_3 = 4;
    uint256 public constant PROJECTS_PER_FINALIST_LIST = 3;
    uint256 public constant FINALIST_LIST_COUNT = 3;
    uint256 public constant PROJECTS_IN_FINAL = 9;

    FinalistVoting public finalistVoting;
    mapping(uint256 => FinalistVotingLib.VotingState) private votingStates;
    mapping(uint256 => mapping(string => uint256)) public projectVoteCounts;
    mapping(uint256 => mapping(uint256 => string[])) public topProjectsByListType;
    
    // Store voter data
    mapping(uint256 => mapping(address => uint256)) public voterListTypes;
    mapping(uint256 => mapping(address => ProposalList)) public votingRounds;

    constructor(address dao) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DAO_ROLE, dao);
        
        finalistVoting = new FinalistVoting();
        finalistVoting.grantRole(DEFAULT_ADMIN_ROLE, address(this));
    }

    function updateVoterData(
        uint256 roundId,
        address voter,
        uint256 listType,
        address proposalList
    ) external onlyRole(DAO_ROLE) {
        voterListTypes[roundId][voter] = listType;
        votingRounds[roundId][voter] = ProposalList(proposalList);
    }

    function startFinalistVoting(
        uint256 roundId,
        address[] memory voters,
        uint256 listTypeCount,
        string[] memory projects,
        uint256 projectCount
    ) external onlyRole(DAO_ROLE) {
        FinalistVotingLib.VotingState storage votingState = votingStates[roundId];
        votingState.listTypeCount = listTypeCount;
        
        string[][] memory currentTopProjectsByListType = new string[][](listTypeCount);
        
        for (uint256 listType = 0; listType < listTypeCount; listType++) {
            string[] memory projectsInListType = new string[](PROJECTS_PER_LIST_TYPE);
            uint256 currentProjectTypeCount = 0;
            
            for (uint256 i = 0; i < projectCount; i++) {
                if (i / PROJECTS_PER_LIST_TYPE == listType) {
                    string memory projectId = projects[i];
                    if (bytes(projectId).length > 0) {
                        projectsInListType[currentProjectTypeCount] = projectId;
                        currentProjectTypeCount++;
                    }
                }
            }
            
            votingState.projectTypeCount = currentProjectTypeCount;
            
            string[] memory sortedProjects = FinalistVotingLib.processVotes(
                votingState,
                voters,
                voterListTypes[roundId],
                votingRounds[roundId],
                listType,
                projectsInListType
            );
            
            uint256 finalistsPerListType = FinalistVotingLib.determineFinalistsPerListType(
                currentProjectTypeCount,
                listTypeCount,
                LIST_TYPES_THRESHOLD_1,
                LIST_TYPES_THRESHOLD_2,
                LIST_TYPES_THRESHOLD_3,
                FINALISTS_PER_LIST_TIER_1,
                FINALISTS_PER_LIST_TIER_2,
                FINALISTS_PER_LIST_TIER_3
            );
            
            string[] memory topProjects = new string[](finalistsPerListType);
            for (uint256 i = 0; i < finalistsPerListType && i < currentProjectTypeCount; i++) {
                topProjects[i] = sortedProjects[i];
            }
            
            currentTopProjectsByListType[listType] = topProjects;
            topProjectsByListType[roundId][listType] = topProjects;
        }
        
        string[][] memory finalistLists = new string[][](FINALIST_LIST_COUNT);
        uint256 finalistIndex = 0;
        
        for (uint256 listType = 0; listType < listTypeCount && finalistIndex < PROJECTS_IN_FINAL; listType++) {
            string[] memory topProjects = currentTopProjectsByListType[listType];
            
            for (uint256 i = 0; i < topProjects.length && finalistIndex < PROJECTS_IN_FINAL; i++) {
                uint256 listIndex = finalistIndex / PROJECTS_PER_FINALIST_LIST;
                uint256 projectIndex = finalistIndex % PROJECTS_PER_FINALIST_LIST;
                
                if (finalistLists[listIndex].length == 0) {
                    finalistLists[listIndex] = new string[](PROJECTS_PER_FINALIST_LIST);
                }
                
                finalistLists[listIndex][projectIndex] = topProjects[i];
                finalistIndex++;
            }
        }
        
        address[] memory activeVoters = FinalistVotingLib.getActiveVoters(
            voters,
            votingRounds[roundId]
        );
        
        finalistVoting.startFinalistVoting(roundId, activeVoters, finalistLists);
    }

    function submitFinalistVote(uint256 roundId, string[] calldata topProjects) external {
        finalistVoting.submitFinalistVote(roundId, topProjects);
    }

    function endFinalistVoting(uint256 roundId) external onlyRole(DAO_ROLE) {
        finalistVoting.endFinalistVoting(roundId);
    }

    function getFinalistVotingList(uint256 roundId, address voter) external view returns (address) {
        return finalistVoting.getFinalistVotingList(roundId, voter);
    }

    function getRoundWinners(uint256 roundId) external view returns (string[] memory) {
        return finalistVoting.getRoundWinners(roundId);
    }
} 