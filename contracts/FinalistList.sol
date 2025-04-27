// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract FinalistList is Ownable {
    address public immutable dao;
    uint256 public immutable votingRound;
    mapping(uint256 => string) public availableProjects;
    uint256 public availableProjectCount;
    bool public voted;
    mapping(uint256 => string) public selectedProjects;
    uint256 public selectedProjectCount;
    uint256 public constant VOTING_WINDOW = 7 days;
    uint256 public createdAt;
    uint256 public finalistListType; // 0-3 (4 different lists)

    modifier onlyDAO() {
        require(msg.sender == dao, "Only DAO can call this");
        _;
    }

    constructor(
        address _dao,
        uint256 _votingRound,
        string[] memory _finalistProjects,
        address _voter,
        uint256 _finalistListType
    ) {
        dao = _dao;
        votingRound = _votingRound;
        availableProjectCount = _finalistProjects.length;
        finalistListType = _finalistListType;
        
        for (uint256 i = 0; i < _finalistProjects.length; i++) {
            availableProjects[i] = _finalistProjects[i];
        }
        
        createdAt = block.timestamp;
        _transferOwnership(_voter);
    }

    // Allow DAO to force transfer ownership for reassignment
    function transferOwnership(address newOwner) public override {
        if (msg.sender == dao) {
            _transferOwnership(newOwner);
            // Reset voting window when ownership is transferred by the DAO
            createdAt = block.timestamp;
        } else {
            revert("Only DAO can reassign ownership");
        }
    }

    // Original owner can still renounce ownership
    function renounceOwnership() public override onlyOwner {
        super.renounceOwnership();
    }

    // Reset the voting window (can only be called by DAO)
    function resetVotingWindow() external onlyDAO {
        require(!voted, "Already voted");
        createdAt = block.timestamp;
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