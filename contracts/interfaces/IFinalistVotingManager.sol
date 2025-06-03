// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IFinalistVotingManager
 * @dev Interface for the Project Merlin finalist voting manager contract
 */
interface IFinalistVotingManager {
    /**
     * @dev Emitted when voter data is updated
     */
    event VoterDataUpdated(uint256 indexed roundId, address indexed voter, uint256 listType);
    
    /**
     * @dev Emitted when finalist voting starts
     */
    event FinalistVotingStarted(uint256 indexed roundId, uint256 listTypeCount, uint256 projectCount);
    
    /**
     * @dev Emitted when top projects are selected
     */
    event TopProjectsSelected(uint256 indexed roundId, uint256 indexed listType, string[] projects);

    /**
     * @dev Returns the DAO role identifier
     */
    function DAO_ROLE() external pure returns (bytes32);
    
    /**
     * @dev Returns the number of projects per list type
     */
    function PROJECTS_PER_LIST_TYPE() external pure returns (uint256);
    
    /**
     * @dev Returns the list types threshold 1
     */
    function LIST_TYPES_THRESHOLD_1() external pure returns (uint256);
    
    /**
     * @dev Returns the list types threshold 2
     */
    function LIST_TYPES_THRESHOLD_2() external pure returns (uint256);
    
    /**
     * @dev Returns the list types threshold 3
     */
    function LIST_TYPES_THRESHOLD_3() external pure returns (uint256);
    
    /**
     * @dev Returns the number of finalists per list for tier 1
     */
    function FINALISTS_PER_LIST_TIER_1() external pure returns (uint256);
    
    /**
     * @dev Returns the number of finalists per list for tier 2
     */
    function FINALISTS_PER_LIST_TIER_2() external pure returns (uint256);
    
    /**
     * @dev Returns the number of finalists per list for tier 3
     */
    function FINALISTS_PER_LIST_TIER_3() external pure returns (uint256);
    
    /**
     * @dev Returns the number of projects per finalist list
     */
    function PROJECTS_PER_FINALIST_LIST() external pure returns (uint256);
    
    /**
     * @dev Returns the number of finalist lists
     */
    function FINALIST_LIST_COUNT() external pure returns (uint256);
    
    /**
     * @dev Returns the total number of projects in final
     */
    function PROJECTS_IN_FINAL() external pure returns (uint256);
    
    /**
     * @dev Returns the finalist voting contract address
     */
    function finalistVoting() external view returns (address);
    
    /**
     * @dev Updates voter data for a round
     * @param roundId ID of the voting round
     * @param voter Address of the voter
     * @param listType Type of list assigned to voter
     * @param proposalList Address of voter's proposal list
     */
    function updateVoterData(
        uint256 roundId,
        address voter,
        uint256 listType,
        address proposalList
    ) external;
    
    /**
     * @dev Starts the finalist voting process
     * @param roundId ID of the voting round
     * @param voters Array of voter addresses
     * @param listTypeCount Number of list types
     * @param projects Array of project IDs
     * @param projectCount Total number of projects
     */
    function startFinalistVoting(
        uint256 roundId,
        address[] memory voters,
        uint256 listTypeCount,
        string[] memory projects,
        uint256 projectCount
    ) external;
    
    /**
     * @dev Submits votes for finalist projects
     * @param roundId ID of the voting round
     * @param topProjects Array of selected project IDs
     */
    function submitFinalistVote(uint256 roundId, string[] calldata topProjects) external;
    
    /**
     * @dev Ends the finalist voting phase
     * @param roundId ID of the voting round
     */
    function endFinalistVoting(uint256 roundId) external;
    
    /**
     * @dev Gets the finalist voting list for a voter
     * @param roundId ID of the voting round
     * @param voter Address of the voter
     * @return Address of the voter's finalist list
     */
    function getFinalistVotingList(uint256 roundId, address voter) external view returns (address);
    
    /**
     * @dev Gets the winning projects for a round
     * @param roundId ID of the voting round
     * @return Array of winning project IDs
     */
    function getRoundWinners(uint256 roundId) external view returns (string[] memory);
} 