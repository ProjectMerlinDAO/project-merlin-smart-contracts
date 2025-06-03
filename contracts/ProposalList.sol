// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IProposalList.sol";

/**
 * @title ProposalList
 * @dev Contract for managing a list of project proposals in Project Merlin's voting system
 *
 * This contract represents a voter's proposal list in a specific voting round.
 * It manages:
 * - Available projects that can be voted on
 * - Selected projects (votes cast)
 * - Voting window timing
 * - Ownership transfers for voter reassignment
 *
 * Security considerations:
 * - Only the DAO can transfer ownership (for voter reassignment)
 * - Voting has a time window
 * - Votes cannot be changed once cast
 * - Access control for viewing voting results
 */
contract ProposalList is Ownable, IProposalList {
    // Core state variables
    address public override immutable dao;
    uint256 public override immutable votingRound;
    mapping(uint256 => string) public availableProjects;
    uint256 public override availableProjectCount;
    bool public override voted;
    mapping(uint256 => string) public selectedProjects;
    uint256 public override selectedProjectCount;
    uint256 public constant override VOTING_WINDOW = 7 days;
    uint256 public override createdAt;

    /**
     * @dev Modifier to restrict functions to only be called by the DAO contract
     */
    modifier onlyDAO() {
        require(msg.sender == dao, "Only DAO can call this");
        _;
    }

    /**
     * @dev Constructor initializes the proposal list with projects and assigns it to a voter
     * @param _dao Address of the DAO contract
     * @param _votingRound ID of the current voting round
     * @param _initialProjects Array of project IDs available for voting
     * @param _voter Address of the initial voter assigned to this list
     *
     * Security:
     * - Sets immutable DAO address
     * - Initializes voting window
     * - Transfers ownership to voter
     */
    constructor(
        address _dao,
        uint256 _votingRound,
        string[] memory _initialProjects,
        address _voter
    ) {
        require(_dao != address(0), "Invalid DAO address");
        require(_voter != address(0), "Invalid voter address");
        require(_initialProjects.length > 0, "No projects provided");

        dao = _dao;
        votingRound = _votingRound;
        availableProjectCount = _initialProjects.length;
        for (uint256 i = 0; i < _initialProjects.length; i++) {
            availableProjects[i] = _initialProjects[i];
        }
        createdAt = block.timestamp;
        _transferOwnership(_voter);
    }

    /**
     * @dev Allows the DAO to transfer ownership for voter reassignment
     * @param newOwner Address of the new voter
     *
     * Security:
     * - Only DAO can reassign
     * - Resets voting window on transfer
     * - Uses OpenZeppelin's Ownable events
     */
    function transferOwnership(address newOwner) public override(Ownable, IProposalList) {
        require(newOwner != address(0), "Invalid new owner");
        if (msg.sender == dao) {
            _transferOwnership(newOwner);
            createdAt = block.timestamp;
        } else {
            revert("Only DAO can reassign ownership");
        }
    }

    /**
     * @dev Allows the current owner to renounce their ownership
     * Security: Original Ownable behavior preserved
     */
    function renounceOwnership() public override onlyOwner {
        super.renounceOwnership();
    }

    /**
     * @dev Resets the voting window for this proposal list
     * Security: Only callable by DAO, cannot reset after voting
     */
    function resetVotingWindow() external override onlyDAO {
        require(!voted, "Already voted");
        createdAt = block.timestamp;
        emit VotingWindowReset(createdAt + VOTING_WINDOW);
    }

    /**
     * @dev Casts votes for selected projects
     * @param _selectedProjects Array of selected project IDs
     *
     * Security:
     * - Only owner can vote
     * - Can only vote once
     * - Must vote within window
     * - Cannot vote for zero projects
     */
    function vote(string[] calldata _selectedProjects) external override onlyOwner {
        require(!voted, "Already voted");
        require(_selectedProjects.length > 0, "No projects selected");
        require(!hasVotingWindowExpired(), "Voting window expired");

        selectedProjectCount = _selectedProjects.length;
        for (uint256 i = 0; i < _selectedProjects.length; i++) {
            selectedProjects[i] = _selectedProjects[i];
        }
        voted = true;
        emit VoteCast(msg.sender, votingRound, _selectedProjects.length);
    }

    /**
     * @dev Returns whether this list has been voted on
     * @return bool True if voted, false otherwise
     */
    function isVoted() external view override returns (bool) {
        return voted;
    }

    /**
     * @dev Returns a specified number of selected projects
     * @param count Number of projects to return
     * @return Array of selected project IDs
     *
     * Security: Only owner or DAO can view results
     */
    function getSelectedProjects(uint256 count) external view override returns (string[] memory) {
        require(voted, "Not voted yet");
        require(msg.sender == owner() || msg.sender == dao, "Not authorized");
        uint256 resultLength = count < selectedProjectCount ? count : selectedProjectCount;
        string[] memory result = new string[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = selectedProjects[i];
        }
        
        return result;
    }

    /**
     * @dev Returns all available projects for this list
     * @return Array of all available project IDs
     */
    function getAllAvailableProjects() external view override returns (string[] memory) {
        string[] memory result = new string[](availableProjectCount);
        for (uint256 i = 0; i < availableProjectCount; i++) {
            result[i] = availableProjects[i];
        }
        return result;
    }

    /**
     * @dev Checks if the voting window has expired
     * @return bool True if expired, false otherwise
     */
    function hasVotingWindowExpired() public view override returns (bool) {
        return block.timestamp > createdAt + VOTING_WINDOW;
    }
} 