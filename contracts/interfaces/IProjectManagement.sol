// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IProjectManagement
 * @dev Interface for the Project Merlin project management library
 * 
 * This library operates on a mapping(string => Project) in storage that tracks all projects.
 * The mapping is maintained by the contract implementing this interface.
 */
interface IProjectManagement {
    /**
     * @dev Emitted when a project is created
     */
    event ProjectCreated(string indexed projectId, address indexed owner, uint256 fundingGoal);
    
    /**
     * @dev Emitted when a project is funded
     */
    event ProjectFunded(string indexed projectId, address indexed contributor, uint256 amount);
    
    /**
     * @dev Emitted when participation count is incremented
     */
    event ParticipationIncremented(string indexed projectId, uint256 newCount);

    /**
     * @dev Project state struct
     */
    struct Project {
        string id;
        address owner;
        uint256 fundingGoal;
        uint256 currentFunding;
        bool exists;
        bool approved;
        uint256 votingParticipationCount;
        string description;
        string title;
        string shortBrief;
        string imageUri;
    }

    /**
     * @dev Creates a new project in the projects mapping
     * @param projectId Unique identifier for the project
     * @param owner Address of the project owner
     * @param fundingGoal Target funding amount
     * @param title Project title
     * @param description Detailed project description
     * @param shortBrief Brief project summary
     * @param imageUri URI for project image
     */
    function createProject(
        string memory projectId,
        address owner,
        uint256 fundingGoal,
        string memory title,
        string memory description,
        string memory shortBrief,
        string memory imageUri
    ) external;

    /**
     * @dev Adds funding to a project in the projects mapping
     * @param projectId ID of the project to fund
     * @param amount Amount of MRLN tokens to contribute
     */
    function contributeToProject(
        string memory projectId,
        uint256 amount
    ) external;

    /**
     * @dev Retrieves project details from the projects mapping
     * @param projectId ID of the project to query
     * @return id Project ID
     * @return isActive Whether the project is approved
     * @return receivedFunding Current funding amount
     * @return title Project title
     * @return description Project description
     * @return shortBrief Project brief
     * @return imageUri Project image URI
     */
    function getProjectDetails(
        string memory projectId
    ) external view returns (
        string memory id,
        bool isActive,
        uint256 receivedFunding,
        string memory title,
        string memory description,
        string memory shortBrief,
        string memory imageUri
    );

    /**
     * @dev Increments the voting participation count in the projects mapping
     * @param projectId ID of the project
     * @return Updated participation count
     */
    function incrementParticipationCount(
        string memory projectId
    ) external returns (uint256);

    /**
     * @dev Gets the current voting participation count from the projects mapping
     * @param projectId ID of the project
     * @return Current participation count
     */
    function getParticipationCount(
        string memory projectId
    ) external view returns (uint256);
} 