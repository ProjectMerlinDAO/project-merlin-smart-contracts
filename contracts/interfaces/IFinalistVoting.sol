// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IFinalistVoting
 * @dev Interface for the Project Merlin finalist voting contract
 */
interface IFinalistVoting {
    /**
     * @dev Emitted when finalist voting starts
     */
    event FinalistVotingStarted(uint256 indexed roundId, uint256 timestamp);
    
    /**
     * @dev Emitted when finalist voting ends
     */
    event FinalistVotingEnded(uint256 indexed roundId, uint256 timestamp);
    
    /**
     * @dev Emitted when winners are selected
     */
    event WinnersSelected(uint256 indexed roundId, string[] winners);
    
    /**
     * @dev Emitted when a finalist list is created
     */
    event FinalistListCreated(uint256 indexed roundId, address indexed voter, uint256 listType);
    
    /**
     * @dev Emitted when a vote is submitted
     */
    event VoteSubmitted(uint256 indexed roundId, address indexed voter, uint256 listType);

    /**
     * @dev Returns the admin role identifier
     */
    function ADMIN_ROLE() external pure returns (bytes32);
    
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
     * @dev Starts the finalist voting phase
     * @param roundId ID of the voting round
     * @param activeVoters Array of active voter addresses
     * @param finalistLists Array of finalist project lists
     */
    function startFinalistVoting(
        uint256 roundId,
        address[] memory activeVoters,
        string[][] memory finalistLists
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