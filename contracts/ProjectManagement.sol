// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library ProjectManagement {
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
    }

    function contributeToProject(
        mapping(string => Project) storage projects,
        string memory projectId,
        uint256 amount
    ) internal {
        Project storage project = projects[projectId];
        require(project.exists, "No project");
        require(project.currentFunding + amount <= project.fundingGoal, "Exceeds goal");
        project.currentFunding += amount;
    }

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
        Project storage project = projects[projectId];
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

    function incrementParticipationCount(
        mapping(string => Project) storage projects,
        string memory projectId
    ) internal returns (uint256) {
        require(projects[projectId].exists, "No project");
        projects[projectId].votingParticipationCount++;
        return projects[projectId].votingParticipationCount;
    }

    function getParticipationCount(
        mapping(string => Project) storage projects,
        string memory projectId
    ) internal view returns (uint256) {
        require(projects[projectId].exists, "No project");
        return projects[projectId].votingParticipationCount;
    }
} 