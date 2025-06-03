// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IFinalistList
 * @dev Interface for the Project Merlin finalist list contract
 */
interface IFinalistList {
    /**
     * @dev Emitted when a vote is cast
     */
    event VoteCast(address indexed voter, uint256 indexed roundId, uint256 listType, uint256 projectCount);
    
    /**
     * @dev Emitted when the voting window is reset
     */
    event VotingWindowReset(uint256 newEndTime);

    /**
     * @dev Returns the DAO contract address
     */
    function dao() external view returns (address);
    
    /**
     * @dev Returns the voting round ID
     */
    function votingRound() external view returns (uint256);
    
    /**
     * @dev Returns the voting window duration
     */
    function VOTING_WINDOW() external pure returns (uint256);
    
    /**
     * @dev Returns the creation timestamp
     */
    function createdAt() external view returns (uint256);
    
    /**
     * @dev Returns whether this list has been voted on
     */
    function voted() external view returns (bool);
    
    /**
     * @dev Returns the number of available projects
     */
    function availableProjectCount() external view returns (uint256);
    
    /**
     * @dev Returns the number of selected projects
     */
    function selectedProjectCount() external view returns (uint256);
    
    /**
     * @dev Returns the finalist list type (0-3)
     */
    function finalistListType() external view returns (uint256);
    
    /**
     * @dev Transfers ownership of the list
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external;
    
    /**
     * @dev Resets the voting window
     */
    function resetVotingWindow() external;
    
    /**
     * @dev Casts votes for selected projects
     * @param _selectedProjects Array of selected project IDs
     */
    function vote(string[] calldata _selectedProjects) external;
    
    /**
     * @dev Returns whether this list has been voted on
     */
    function isVoted() external view returns (bool);
    
    /**
     * @dev Returns a specified number of selected projects
     * @param count Number of projects to return
     * @return Array of selected project IDs
     */
    function getSelectedProjects(uint256 count) external view returns (string[] memory);
    
    /**
     * @dev Returns all available projects for this list
     * @return Array of all available project IDs
     */
    function getAllAvailableProjects() external view returns (string[] memory);
    
    /**
     * @dev Checks if the voting window has expired
     * @return bool True if expired, false otherwise
     */
    function hasVotingWindowExpired() external view returns (bool);
} 