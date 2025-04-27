// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProposalList.sol";

library FinalistVotingLib {
    struct VotingState {
        mapping(string => uint256) voteCounts;
        uint256 projectTypeCount;
        uint256 listTypeCount;
    }

    function processVotes(
        VotingState storage state,
        address[] memory voters,
        mapping(address => uint256) storage voterListTypes,
        mapping(address => ProposalList) storage votingRounds,
        uint256 listType,
        string[] memory projectsInListType
    ) internal returns (string[] memory) {
        for (uint256 i = 0; i < voters.length; i++) {
            address voter = voters[i];
            
            if (voterListTypes[voter] == listType) {
                ProposalList proposalList = votingRounds[voter];
                
                if (proposalList.voted()) {
                    string[] memory selections = proposalList.getSelectedProjects(5);
                    
                    for (uint256 j = 0; j < selections.length; j++) {
                        string memory projectId = selections[j];
                        state.voteCounts[projectId]++;
                    }
                }
            }
        }

        string[] memory sortedProjects = new string[](state.projectTypeCount);
        uint256[] memory voteCountArray = new uint256[](state.projectTypeCount);
        
        for (uint256 i = 0; i < state.projectTypeCount; i++) {
            sortedProjects[i] = projectsInListType[i];
            voteCountArray[i] = state.voteCounts[projectsInListType[i]];
        }
        
        for (uint256 i = 0; i < state.projectTypeCount; i++) {
            for (uint256 j = i + 1; j < state.projectTypeCount; j++) {
                if (voteCountArray[i] < voteCountArray[j]) {
                    uint256 tempCount = voteCountArray[i];
                    voteCountArray[i] = voteCountArray[j];
                    voteCountArray[j] = tempCount;
                    
                    string memory tempProject = sortedProjects[i];
                    sortedProjects[i] = sortedProjects[j];
                    sortedProjects[j] = tempProject;
                }
            }
        }

        return sortedProjects;
    }

    function determineFinalistsPerListType(
        uint256 projectCount,
        uint256 listTypeCount,
        uint256 threshold1,
        uint256 threshold2,
        uint256 threshold3,
        uint256 tier1,
        uint256 tier2,
        uint256 tier3
    ) internal pure returns (uint256) {
        if (projectCount < threshold1) {
            uint256 finalistsPerListType = projectCount / listTypeCount;
            return finalistsPerListType == 0 ? 1 : finalistsPerListType;
        } else if (projectCount < threshold2) {
            return tier1;
        } else if (projectCount < threshold3) {
            return tier2;
        } else {
            return tier3;
        }
    }

    function getActiveVoters(
        address[] memory allVoters,
        mapping(address => ProposalList) storage votingRounds
    ) internal view returns (address[] memory) {
        address[] memory activeVoters = new address[](allVoters.length);
        uint256 activeVoterCount = 0;
        
        for (uint256 i = 0; i < allVoters.length; i++) {
            address voter = allVoters[i];
            ProposalList proposalList = votingRounds[voter];
            
            if (proposalList.voted()) {
                activeVoters[activeVoterCount] = voter;
                activeVoterCount++;
            }
        }
        
        // Resize array to actual count
        assembly {
            mstore(activeVoters, activeVoterCount)
        }
        
        return activeVoters;
    }
} 