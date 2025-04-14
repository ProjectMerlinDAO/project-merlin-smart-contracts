// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ProposalList is Ownable {
    address public immutable dao;
    uint256 public immutable votingRound;
    mapping(uint256 => string) public availableProjects;
    uint256 public availableProjectCount;
    bool public voted;
    mapping(uint256 => string) public selectedProjects;
    uint256 public selectedProjectCount;
    uint256 public constant VOTING_WINDOW = 7 days;
    uint256 public immutable createdAt;

    modifier onlyDAO() {
        require(msg.sender == dao, "Only DAO can call this");
        _;
    }

    constructor(
        address _dao,
        uint256 _votingRound,
        string[] memory _initialProjects,
        address _voter
    ) {
        dao = _dao;
        votingRound = _votingRound;
        availableProjectCount = _initialProjects.length;
        for (uint256 i = 0; i < _initialProjects.length; i++) {
            availableProjects[i] = _initialProjects[i];
        }
        createdAt = block.timestamp;
        _transferOwnership(_voter);
    }

    function vote(string[] calldata _selectedProjects) external onlyOwner {
        require(!voted, "Already voted");
        require(_selectedProjects.length > 0, "No projects selected");
        require(!hasVotingWindowExpired(), "Voting window expired");

        selectedProjectCount = _selectedProjects.length;
        for (uint256 i = 0; i < _selectedProjects.length; i++) {
            selectedProjects[i] = _selectedProjects[i];
        }
        voted = true;
    }

    function isVoted() external view returns (bool) {
        return voted;
    }

    function getSelectedProjects(uint256 count) external view returns (string[] memory) {
        require(voted, "Not voted yet");
        require(msg.sender == owner() || msg.sender == dao, "Not authorized");
        uint256 resultLength = count < selectedProjectCount ? count : selectedProjectCount;
        string[] memory result = new string[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = selectedProjects[i];
        }
        
        return result;
    }

    function getAllAvailableProjects() external view returns (string[] memory) {
        string[] memory result = new string[](availableProjectCount);
        for (uint256 i = 0; i < availableProjectCount; i++) {
            result[i] = availableProjects[i];
        }
        return result;
    }

    function hasVotingWindowExpired() public view returns (bool) {
        return block.timestamp > createdAt + VOTING_WINDOW;
    }
} 