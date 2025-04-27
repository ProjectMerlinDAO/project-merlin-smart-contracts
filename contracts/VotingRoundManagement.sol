// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProposalList.sol";

library VotingRoundManagement {
    struct VotingRound {
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 projectCount;
    }

    function createVotingRound(
        mapping(uint256 => VotingRound) storage votingRoundInfo,
        mapping(uint256 => mapping(uint256 => string)) storage roundProjects,
        mapping(uint256 => bool) storage roundExists,
        uint256 roundId,
        string[] memory projects,
        uint256 votingDuration
    ) internal {
        require(projects.length > 0, "No projects");
        
        // Store projects using index mapping
        for (uint256 i = 0; i < projects.length; i++) {
            roundProjects[roundId][i] = projects[i];
        }
        
        roundExists[roundId] = true;

        votingRoundInfo[roundId] = VotingRound({
            startTime: block.timestamp,
            endTime: block.timestamp + votingDuration,
            isActive: true,
            projectCount: projects.length
        });
    }

    function createProposalLists(
        mapping(uint256 => mapping(address => ProposalList)) storage votingRounds,
        uint256 roundId,
        address[] memory voters,
        string[] memory projects,
        address daoAddress
    ) internal {
        for (uint256 i = 0; i < voters.length; i++) {
            ProposalList proposalList = new ProposalList(
                daoAddress,
                roundId,
                projects,
                voters[i]
            );
            votingRounds[roundId][voters[i]] = proposalList;
        }
    }

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