// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ProposalList.sol";
import "./FinalistVoting.sol";
import "./FinalistVotingLib.sol";

/**
 * @title FinalistVotingManager
 * @dev Contract for managing the finalist voting process in Project Merlin's DAO
 *
 * This contract manages:
 * - Finalist voting initialization and coordination
 * - Vote processing and aggregation
 * - Project list type management
 * - Finalist selection process
 * - Integration with FinalistVoting contract
 *
 * Security considerations:
 * - Role-based access control
 * - Protected state management
 * - Secure vote processing
 * - Safe finalist selection
 * - Protected contract interactions
 */
contract FinalistVotingManager is AccessControl {
    using FinalistVotingLib for FinalistVotingLib.VotingState;

    // Access control roles
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    
    // Configuration constants
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

    // Core contracts and state
    FinalistVoting public immutable finalistVoting;
    mapping(uint256 => FinalistVotingLib.VotingState) private votingStates;
    mapping(uint256 => mapping(string => uint256)) public projectVoteCounts;
    mapping(uint256 => mapping(uint256 => string[])) public topProjectsByListType;
    
    // Voter tracking
    mapping(uint256 => mapping(address => uint256)) public voterListTypes;
    mapping(uint256 => mapping(address => ProposalList)) public votingRounds;

    // Events
    event VoterDataUpdated(uint256 indexed roundId, address indexed voter, uint256 listType);
    event FinalistVotingStarted(uint256 indexed roundId, uint256 listTypeCount, uint256 projectCount);
    event TopProjectsSelected(uint256 indexed roundId, uint256 indexed listType, string[] projects);

    /**
     * @dev Constructor initializes the manager with DAO access
     * @param dao Address of the DAO contract
     *
     * Security:
     * - Sets up access control
     * - Deploys FinalistVoting contract
     * - Configures contract permissions
     */
    constructor(address dao) {
        require(dao != address(0), "Invalid DAO address");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DAO_ROLE, dao);
        
        finalistVoting = new FinalistVoting();
        finalistVoting.grantRole(DEFAULT_ADMIN_ROLE, address(this));
    }

    /**
     * @dev Updates voter data for a round
     * @param roundId ID of the voting round
     * @param voter Address of the voter
     * @param listType Type of list assigned to voter
     * @param proposalList Address of voter's proposal list
     *
     * Security:
     * - Only DAO can call
     * - Validates input parameters
     * - Protected state updates
     */
    function updateVoterData(
        uint256 roundId,
        address voter,
        uint256 listType,
        address proposalList
    ) external onlyRole(DAO_ROLE) {
        require(voter != address(0), "Invalid voter address");
        require(proposalList != address(0), "Invalid proposal list");
        require(listType < FINALIST_LIST_COUNT, "Invalid list type");

        voterListTypes[roundId][voter] = listType;
        votingRounds[roundId][voter] = ProposalList(proposalList);
        emit VoterDataUpdated(roundId, voter, listType);
    }

    /**
     * @dev Starts the finalist voting process
     * @param roundId ID of the voting round
     * @param voters Array of voter addresses
     * @param listTypeCount Number of list types
     * @param projects Array of project IDs
     * @param projectCount Total number of projects
     *
     * Security:
     * - Only DAO can call
     * - Validates input parameters
     * - Protected vote processing
     * - Safe finalist selection
     * - Protected state transitions
     */
    function startFinalistVoting(
        uint256 roundId,
        address[] memory voters,
        uint256 listTypeCount,
        string[] memory projects,
        uint256 projectCount
    ) external onlyRole(DAO_ROLE) {
        require(voters.length > 0, "No voters provided");
        require(projects.length > 0, "No projects provided");
        require(listTypeCount > 0 && listTypeCount <= FINALIST_LIST_COUNT, "Invalid list type count");
        require(projectCount > 0 && projectCount <= projects.length, "Invalid project count");

        FinalistVotingLib.VotingState storage votingState = votingStates[roundId];
        require(!votingState.isActive, "Finalist voting already started");
        
        votingState.listTypeCount = listTypeCount;
        votingState.isActive = true;
        
        // Process votes for each list type
        for (uint256 i = 0; i < listTypeCount; i++) {
            // Get projects for this list type
            uint256 projectsPerListType = projectCount / listTypeCount;
            if (projectsPerListType > PROJECTS_PER_LIST_TYPE) {
                projectsPerListType = PROJECTS_PER_LIST_TYPE;
            }
            
            string[] memory projectsInListType = new string[](projectsPerListType);
            uint256 startIndex = i * projectsPerListType;
            for (uint256 j = 0; j < projectsPerListType && startIndex + j < projects.length; j++) {
                projectsInListType[j] = projects[startIndex + j];
            }
            
            // Process votes and store top projects
//            string[] memory topProjects = FinalistVotingLib.processVotes(
//                votingState,
//                voters,
//                voterListTypes[roundId],
//                votingRounds[roundId],
//                i,
//                projectsInListType
//            );
//
//            votingState.topProjectsByListType[i] = topProjects;
//            emit TopProjectsSelected(roundId, i, topProjects);
        }
        
        // Create finalist lists
        string[][] memory finalistLists = new string[][](FINALIST_LIST_COUNT);
        uint256 finalistIndex = 0;
        
        for (uint256 i = 0; i < listTypeCount && finalistIndex < PROJECTS_IN_FINAL; i++) {
            string[] memory topProjects = votingState.topProjectsByListType[i];
            
            for (uint256 j = 0; j < topProjects.length && finalistIndex < PROJECTS_IN_FINAL; j++) {
                uint256 listIndex = finalistIndex / PROJECTS_PER_FINALIST_LIST;
                uint256 projectIndex = finalistIndex % PROJECTS_PER_FINALIST_LIST;
                
                if (finalistLists[listIndex].length == 0) {
                    finalistLists[listIndex] = new string[](PROJECTS_PER_FINALIST_LIST);
                }
                
                finalistLists[listIndex][projectIndex] = topProjects[j];
                finalistIndex++;
            }
        }
        
        // Get active voters
        address[] memory activeVoters = new address[](voters.length);
        uint256 activeVoterCount = 0;
        
        for (uint256 i = 0; i < voters.length; i++) {
            address voter = voters[i];
            ProposalList proposalList = votingRounds[roundId][voter];
            
            if (proposalList.voted()) {
                activeVoters[activeVoterCount] = voter;
                activeVoterCount++;
            }
        }
        
        require(activeVoterCount > 0, "No active voters found");
        
        // Start finalist voting
        finalistVoting.startFinalistVoting(roundId, activeVoters, finalistLists);
        emit FinalistVotingStarted(roundId, listTypeCount, projectCount);
    }

    /**
     * @dev Submits votes for finalist projects
     * @param roundId ID of the voting round
     * @param topProjects Array of selected project IDs
     */
    function submitFinalistVote(uint256 roundId, string[] calldata topProjects) external {
        require(topProjects.length > 0, "No projects selected");
        finalistVoting.submitFinalistVote(roundId, topProjects);
    }

    /**
     * @dev Ends the finalist voting phase
     * @param roundId ID of the voting round
     */
    function endFinalistVoting(uint256 roundId) external onlyRole(DAO_ROLE) {
        finalistVoting.endFinalistVoting(roundId);
    }

    /**
     * @dev Gets the finalist voting list for a voter
     * @param roundId ID of the voting round
     * @param voter Address of the voter
     * @return Address of the voter's finalist list
     */
    function getFinalistVotingList(uint256 roundId, address voter) external view returns (address) {
        require(voter != address(0), "Invalid voter address");
        return finalistVoting.getFinalistVotingList(roundId, voter);
    }

    /**
     * @dev Gets the winning projects for a round
     * @param roundId ID of the voting round
     * @return Array of winning project IDs
     */
    function getRoundWinners(uint256 roundId) external view returns (string[] memory) {
        return finalistVoting.getRoundWinners(roundId);
    }

    function getFinalistsPerListType(uint256 projectCount) internal pure returns (uint256) {
        if (projectCount <= LIST_TYPES_THRESHOLD_1) {
            return FINALISTS_PER_LIST_TIER_1;
        } else if (projectCount <= LIST_TYPES_THRESHOLD_2) {
            return FINALISTS_PER_LIST_TIER_2;
        } else {
            return FINALISTS_PER_LIST_TIER_3;
        }
    }
} 