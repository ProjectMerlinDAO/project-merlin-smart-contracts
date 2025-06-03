// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProposalList.sol";

/**
 * @title FinalistVotingLib
 * @dev Library for managing finalist voting logic in Project Merlin's DAO
 *
 * This library provides core functionality for:
 * - Processing and tallying votes
 * - Determining finalist allocation based on project count
 * - Managing active voter tracking
 * - Vote counting and sorting algorithms
 *
 * Security considerations:
 * - Safe state management through storage pointers
 * - Protected against integer overflow
 * - Memory-efficient vote processing
 * - Secure array resizing using assembly
 */
library FinalistVotingLib {
    // Constants for list type thresholds
    uint256 constant LIST_TYPES_THRESHOLD_1 = 20;
    uint256 constant LIST_TYPES_THRESHOLD_2 = 50;
    uint256 constant LIST_TYPES_THRESHOLD_3 = 100;
    
    // Constants for finalists per list tier
    uint256 constant FINALISTS_PER_LIST_TIER_1 = 2;
    uint256 constant FINALISTS_PER_LIST_TIER_2 = 3;
    uint256 constant FINALISTS_PER_LIST_TIER_3 = 4;

    /**
     * @dev Struct to maintain voting state across function calls
     * @param voteCounts Mapping of project IDs to their vote counts
     * @param projectTypeCount Number of projects in the current list type
     * @param listTypeCount Total number of list types
     */
    struct VotingState {
        mapping(string => uint256) voteCounts;
        mapping(uint256 => string[]) topProjectsByListType;
        uint256 projectTypeCount;
        uint256 listTypeCount;
        bool isActive;
    }

    /**
     * @dev Processes votes for a specific list type and returns sorted projects by vote count
     * @param state Current voting state
     * @param voters Array of all voter addresses
     * @param voterListTypes Mapping of voters to their assigned list types
     * @param votingRounds Mapping of voters to their proposal lists
     * @param listType Current list type being processed
     * @param projectsInListType Array of projects in the current list type
     * @return Array of project IDs sorted by vote count (descending)
     *
     * Security:
     * - Only processes votes from valid voters
     * - Only counts votes from completed proposal lists
     * - Safe vote counting with overflow protection
     * - Memory-efficient sorting algorithm
     */
    function processVotes(
        VotingState storage state,
        address[] memory voters,
        mapping(address => uint256) storage voterListTypes,
        mapping(address => ProposalList) storage votingRounds,
        uint256 listType,
        string[] memory projectsInListType
    ) internal returns (string[] memory) {
        // Count votes for each project
        for (uint256 i = 0; i < voters.length; i++) {
            address voter = voters[i];
            
            if (voterListTypes[voter] == listType) {
                ProposalList proposalList = votingRounds[voter];
                
                if (proposalList.voted()) {
                    try proposalList.getSelectedProjects(proposalList.selectedProjectCount()) returns (string[] memory selections) {
                        for (uint256 j = 0; j < selections.length; j++) {
                            string memory projectId = selections[j];
                            state.voteCounts[projectId]++;
                        }
                    } catch {
                        // Skip if there's an error getting selected projects
                        continue;
                    }
                }
            }
        }

        // Create arrays for sorting
        string[] memory sortedProjects = new string[](projectsInListType.length);
        uint256[] memory voteCountArray = new uint256[](projectsInListType.length);
        
        // Initialize arrays with project data
        for (uint256 i = 0; i < projectsInListType.length; i++) {
            sortedProjects[i] = projectsInListType[i];
            voteCountArray[i] = state.voteCounts[projectsInListType[i]];
        }
        
        // Sort projects by vote count (bubble sort)
        for (uint256 i = 0; i < projectsInListType.length - 1; i++) {
            for (uint256 j = 0; j < projectsInListType.length - i - 1; j++) {
                if (voteCountArray[j] < voteCountArray[j + 1]) {
                    // Swap vote counts
                    uint256 tempCount = voteCountArray[j];
                    voteCountArray[j] = voteCountArray[j + 1];
                    voteCountArray[j + 1] = tempCount;
                    
                    // Swap projects
                    string memory tempProject = sortedProjects[j];
                    sortedProjects[j] = sortedProjects[j + 1];
                    sortedProjects[j + 1] = tempProject;
                }
            }
        }
        
        // Return top projects based on list type
        uint256 finalistsCount = getFinalistsCount(projectsInListType.length);
        string[] memory topProjects = new string[](finalistsCount);
        for (uint256 i = 0; i < finalistsCount && i < sortedProjects.length; i++) {
            topProjects[i] = sortedProjects[i];
        }
        
        return topProjects;
    }

    function getFinalistsCount(uint256 projectCount) internal pure returns (uint256) {
        if (projectCount <= LIST_TYPES_THRESHOLD_1) {
            return FINALISTS_PER_LIST_TIER_1;
        } else if (projectCount <= LIST_TYPES_THRESHOLD_2) {
            return FINALISTS_PER_LIST_TIER_2;
        } else {
            return FINALISTS_PER_LIST_TIER_3;
        }
    }

    /**
     * @dev Determines the number of finalists per list type based on project count
     * @param projectCount Total number of projects
     * @param listTypeCount Number of list types
     * @param threshold1 First threshold for finalist count determination
     * @param threshold2 Second threshold for finalist count determination
     * @param threshold3 Third threshold for finalist count determination
     * @param tier1 Number of finalists for tier 1
     * @param tier2 Number of finalists for tier 2
     * @param tier3 Number of finalists for tier 3
     * @return Number of finalists per list type
     *
     * Security:
     * - Pure function with no state changes
     * - Safe division with minimum return value of 1
     * - Clear threshold-based logic
     */
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

    /**
     * @dev Returns an array of active voters who have completed voting
     * @param allVoters Array of all voter addresses
     * @param votingRounds Mapping of voters to their proposal lists
     * @return Array of active voter addresses
     *
     * Security:
     * - Memory-efficient array resizing
     * - Safe array length management
     * - View function with no state changes
     * - Protected array access
     */
    function getActiveVoters(
        address[] memory allVoters,
        mapping(address => ProposalList) storage votingRounds
    ) internal view returns (address[] memory) {
        address[] memory activeVoters = new address[](allVoters.length);
        uint256 activeVoterCount = 0;
        
        // Collect active voters
        for (uint256 i = 0; i < allVoters.length; i++) {
            address voter = allVoters[i];
            ProposalList proposalList = votingRounds[voter];
            
            if (proposalList.voted()) {
                activeVoters[activeVoterCount] = voter;
                activeVoterCount++;
            }
        }
        
        // Resize array to actual count using assembly for gas efficiency
        assembly {
            mstore(activeVoters, activeVoterCount)
        }
        
        return activeVoters;
    }
} 
