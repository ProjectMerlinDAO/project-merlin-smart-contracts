// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProjectManagement
 * @dev Library for managing projects in Project Merlin's DAO
 *
 * This library provides core functionality for:
 * - Project creation and management
 * - Funding tracking and contribution handling
 * - Project participation tracking
 * - Project metadata management
 *
 * Security considerations:
 * - Safe state management through storage pointers
 * - Protected against overflow in funding calculations
 * - Secure project existence validation
 * - Protected participation tracking
 */
library ProjectManagement {
    /**
     * @dev Struct to maintain project state and metadata
     * @param id Unique identifier for the project
     * @param owner Address of the project owner
     * @param fundingGoal Target funding amount in MRLN tokens
     * @param currentFunding Current amount of funding received
     * @param exists Whether the project exists
     * @param approved Whether the project is approved
     * @param votingParticipationCount Number of voting rounds participated in
     * @param description Detailed project description
     * @param title Project title
     * @param shortBrief Brief project summary
     * @param imageUri URI for project image
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

    // Events
    event ProjectCreated(string indexed projectId, address indexed owner, uint256 fundingGoal);
    event ProjectFunded(string indexed projectId, address indexed contributor, uint256 amount);
    event ParticipationIncremented(string indexed projectId, uint256 newCount);

    /**
     * @dev Creates a new project with specified parameters
     * @param projects Mapping of project IDs to Project structs
     * @param projectId Unique identifier for the project
     * @param owner Address of the project owner
     * @param fundingGoal Target funding amount
     * @param title Project title
     * @param description Detailed project description
     * @param shortBrief Brief project summary
     * @param imageUri URI for project image
     *
     * Security:
     * - Validates project existence
     * - Validates funding goal
     * - Validates input parameters
     * - Protected state updates
     */
    function createProject(
        mapping(string => Project) storage projects,
        string memory projectId,
        address owner,
        uint256 fundingGoal,
        string memory title,
        string memory description,
        string memory shortBrief,
        string memory imageUri
    ) internal {
        require(!projects[projectId].exists, "Project exists");
        require(fundingGoal > 0, "Invalid goal");
        require(bytes(projectId).length > 0, "Invalid project ID");
        require(owner != address(0), "Invalid owner");
        require(bytes(title).length > 0, "Invalid title");
        require(bytes(description).length > 0, "Invalid description");
        require(bytes(shortBrief).length > 0, "Invalid brief");
        require(bytes(imageUri).length > 0, "Invalid image URI");

        projects[projectId] = Project({
            id: projectId,
            owner: owner,
            fundingGoal: fundingGoal,
            currentFunding: 0,
            exists: true,
            approved: true,
            votingParticipationCount: 0,
            description: description,
            title: title,
            shortBrief: shortBrief,
            imageUri: imageUri
        });

        emit ProjectCreated(projectId, owner, fundingGoal);
    }

    /**
     * @dev Adds funding to a project
     * @param projects Mapping of project IDs to Project structs
     * @param projectId ID of the project to fund
     * @param amount Amount of MRLN tokens to contribute
     *
     * Security:
     * - Validates project existence
     * - Checks funding goal overflow
     * - Protected state updates
     * - Safe arithmetic operations
     */
    function contributeToProject(
        mapping(string => Project) storage projects,
        string memory projectId,
        uint256 amount
    ) internal {
        require(bytes(projectId).length > 0, "Invalid project ID");
        require(amount > 0, "Invalid amount");

        Project storage project = projects[projectId];
        require(project.exists, "No project");
        require(project.currentFunding + amount <= project.fundingGoal, "Exceeds goal");
        
        project.currentFunding += amount;
        emit ProjectFunded(projectId, msg.sender, amount);
    }

    /**
     * @dev Retrieves project details
     * @param projects Mapping of project IDs to Project structs
     * @param projectId ID of the project to query
     * @return id Project ID
     * @return isActive Whether the project is approved
     * @return receivedFunding Current funding amount
     * @return title Project title
     * @return description Project description
     * @return shortBrief Project brief
     * @return imageUri Project image URI
     *
     * Security:
     * - Safe state access
     * - Memory-efficient returns
     */
    function getProjectDetails(
        mapping(string => Project) storage projects,
        string memory projectId
    ) internal view returns (
        string memory id,
        bool isActive,
        uint256 receivedFunding,
        string memory title,
        string memory description,
        string memory shortBrief,
        string memory imageUri
    ) {
        require(bytes(projectId).length > 0, "Invalid project ID");
        Project storage project = projects[projectId];
        require(project.exists, "No project");

        return (
            project.id,
            project.approved,
            project.currentFunding,
            project.title,
            project.description,
            project.shortBrief,
            project.imageUri
        );
    }

    /**
     * @dev Increments the voting participation count for a project
     * @param projects Mapping of project IDs to Project structs
     * @param projectId ID of the project
     * @return Updated participation count
     *
     * Security:
     * - Validates project existence
     * - Protected state updates
     * - Safe arithmetic operations
     */
    function incrementParticipationCount(
        mapping(string => Project) storage projects,
        string memory projectId
    ) internal returns (uint256) {
        require(bytes(projectId).length > 0, "Invalid project ID");
        require(projects[projectId].exists, "No project");
        
        projects[projectId].votingParticipationCount++;
        uint256 newCount = projects[projectId].votingParticipationCount;
        
        emit ParticipationIncremented(projectId, newCount);
        return newCount;
    }

    /**
     * @dev Gets the current voting participation count for a project
     * @param projects Mapping of project IDs to Project structs
     * @param projectId ID of the project
     * @return Current participation count
     *
     * Security:
     * - Validates project existence
     * - Safe state access
     */
    function getParticipationCount(
        mapping(string => Project) storage projects,
        string memory projectId
    ) internal view returns (uint256) {
        require(bytes(projectId).length > 0, "Invalid project ID");
        require(projects[projectId].exists, "No project");
        return projects[projectId].votingParticipationCount;
    }
} 