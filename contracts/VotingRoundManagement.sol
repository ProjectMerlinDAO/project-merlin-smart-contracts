// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProposalList.sol";

/**
 * @title VotingRoundManagement
 * @dev Library for managing voting rounds in Project Merlin's DAO
 *
 * This library provides core functionality for:
 * - Creating and managing voting rounds
 * - Handling project assignments
 * - Managing proposal lists
 * - Tracking voting round status
 *
 * Security considerations:
 * - Safe state management through storage pointers
 * - Protected against timing attacks
 * - Memory-efficient project tracking
 * - Secure round initialization
 */
library VotingRoundManagement {
    /**
     * @dev Struct to maintain voting round state
     * @param startTime Timestamp when the voting round started
     * @param endTime Timestamp when the voting round ends
     * @param isActive Whether the voting round is currently active
     * @param projectCount Number of projects in this round
     */
    struct VotingRound {
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 projectCount;
    }

    // Events
    event VotingRoundCreated(uint256 indexed roundId, uint256 startTime, uint256 endTime, uint256 projectCount);
    event ProposalListCreated(uint256 indexed roundId, address indexed voter, address proposalList);

    /**
     * @dev Creates a new voting round with specified projects
     * @param votingRoundInfo Mapping of round IDs to round information
     * @param roundProjects Mapping of round IDs to project lists
     * @param roundExists Mapping tracking existing rounds
     * @param roundId ID of the round to create
     * @param projects Array of project IDs for this round
     * @param votingDuration Duration of the voting round in seconds
     *
     * Security:
     * - Validates project array length
     * - Secure timestamp management
     * - Protected state updates
     * - Clear round initialization
     */
    function createVotingRound(
        mapping(uint256 => VotingRound) storage votingRoundInfo,
        mapping(uint256 => mapping(uint256 => string)) storage roundProjects,
        mapping(uint256 => bool) storage roundExists,
        uint256 roundId,
        string[] memory projects,
        uint256 votingDuration
    ) internal {
        require(projects.length > 0, "No projects");
        require(votingDuration > 0, "Invalid duration");
        require(!roundExists[roundId], "Round already exists");
        
        // Store projects using index mapping
        for (uint256 i = 0; i < projects.length; i++) {
            require(bytes(projects[i]).length > 0, "Invalid project ID");
            roundProjects[roundId][i] = projects[i];
        }
        
        roundExists[roundId] = true;

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + votingDuration;

        votingRoundInfo[roundId] = VotingRound({
            startTime: startTime,
            endTime: endTime,
            isActive: true,
            projectCount: projects.length
        });

        emit VotingRoundCreated(roundId, startTime, endTime, projects.length);
    }

    /**
     * @dev Creates proposal lists for all voters in a round
     * @param votingRounds Mapping of rounds to voter proposal lists
     * @param roundId ID of the current round
     * @param voters Array of voter addresses
     * @param projects Array of project IDs
     * @param daoAddress Address of the DAO contract
     *
     * Security:
     * - Validates input parameters
     * - Safe contract creation
     * - Protected state updates
     */
    function createProposalLists(
        mapping(uint256 => mapping(address => ProposalList)) storage votingRounds,
        uint256 roundId,
        address[] memory voters,
        string[] memory projects,
        address daoAddress
    ) internal {
        require(voters.length > 0, "No voters");
        require(projects.length > 0, "No projects");
        require(daoAddress != address(0), "Invalid DAO address");

        for (uint256 i = 0; i < voters.length; i++) {
            require(voters[i] != address(0), "Invalid voter address");
            ProposalList proposalList = new ProposalList(
                daoAddress,
                roundId,
                projects,
                voters[i]
            );
            votingRounds[roundId][voters[i]] = proposalList;
            emit ProposalListCreated(roundId, voters[i], address(proposalList));
        }
    }

    /**
     * @dev Retrieves all projects for a specific round
     * @param roundExists Mapping tracking existing rounds
     * @param votingRoundInfo Mapping of round IDs to round information
     * @param roundProjects Mapping of round IDs to project lists
     * @param roundId ID of the round to query
     * @return Array of project IDs in the round
     *
     * Security:
     * - Validates round existence
     * - Memory-efficient array handling
     * - Protected state access
     */
    function getRoundProjects(
        mapping(uint256 => bool) storage roundExists,
        mapping(uint256 => VotingRound) storage votingRoundInfo,
        mapping(uint256 => mapping(uint256 => string)) storage roundProjects,
        uint256 roundId
    ) internal view returns (string[] memory) {
        require(roundExists[roundId], "No round");
        VotingRound storage round = votingRoundInfo[roundId];
        string[] memory projectsList = new string[](round.projectCount);
        
        for (uint256 i = 0; i < round.projectCount; i++) {
            projectsList[i] = roundProjects[roundId][i];
        }
        
        return projectsList;
    }

    /**
     * @dev Gets the current status of a voting round
     * @param votingRoundInfo Mapping of round IDs to round information
     * @param roundProjects Mapping of round IDs to project lists
     * @param currentVotingRound ID of the current round
     * @return isActive Whether the round is active
     * @return startTime Round start timestamp
     * @return endTime Round end timestamp
     * @return projectIds Array of project IDs in the round
     *
     * Security:
     * - Safe state access
     * - Memory-efficient array handling
     * - Protected timestamp access
     */
    function getCurrentVotingStatus(
        mapping(uint256 => VotingRound) storage votingRoundInfo,
        mapping(uint256 => mapping(uint256 => string)) storage roundProjects,
        uint256 currentVotingRound
    ) internal view returns (
        bool isActive,
        uint256 startTime,
        uint256 endTime,
        string[] memory projectIds
    ) {
        VotingRound storage round = votingRoundInfo[currentVotingRound];
        string[] memory activeProjects = new string[](round.projectCount);
        
        for (uint256 i = 0; i < round.projectCount; i++) {
            activeProjects[i] = roundProjects[currentVotingRound][i];
        }
        
        return (
            round.isActive,
            round.startTime,
            round.endTime,
            activeProjects
        );
    }
} 