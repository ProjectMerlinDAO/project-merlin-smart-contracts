// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./ProposalList.sol";

contract ProjectDAO is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CORE_TEAM_ROLE = keccak256("CORE_TEAM_ROLE");
    bytes32 public constant SUPER_ADMIN_ROLE = keccak256("SUPER_ADMIN_ROLE");
    bytes32 public constant OFFCHAIN_PROCESSOR_ROLE = keccak256("OFFCHAIN_PROCESSOR_ROLE");

    IERC721 public communityNFT;
    IERC20 public mrlnToken;

    struct Project {
        string id;
        address owner;
        uint256 fundingGoal;
        uint256 currentFunding;
        bool exists;
        bool approved;
    }

    struct VotingRound {
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 projectCount;
    }

    mapping(string => Project) public projects;
    mapping(uint256 => mapping(address => ProposalList)) public votingRounds;
    mapping(uint256 => mapping(uint256 => string)) public roundProjects;
    mapping(uint256 => bool) public roundExists;
    mapping(uint256 => VotingRound) public votingRoundInfo;
    
    uint256 public currentVotingRound;
    uint256 public constant VOTING_DURATION = 7 days;
    uint256 public constant SUBMISSION_FEE = 0.1 ether;
    
    uint256 public constant MIN_VOTING_POWER = 1;
    uint256 public constant RAVEN_MESSAGE_FEE = 100 * 10**18; // 100 MRLN
    uint256 public constant PROJECTS_PER_LIST = 5;
    uint256 public constant LIST_EXPIRY_TIME = 7 days;

    address public offchainProcessor;

    event ProjectSubmitted(string indexed projectId, address indexed owner, uint256 fundingGoal);
    event ProjectContribution(string indexed projectId, address indexed contributor, uint256 amount);
    event VotingRoundStarted(uint256 indexed roundId, string[] projects);
    event VoteSubmitted(uint256 indexed roundId, address indexed voter, string[] topProjects);
    event ProposalListAssigned(address indexed voter, address indexed proposalList);
    event ProposalListReassigned(address indexed oldVoter, address indexed newVoter, address indexed proposalList);
    event OffchainProcessorUpdated(address indexed oldProcessor, address indexed newProcessor);
    event DAOPaused(address indexed account);
    event DAOUnpaused(address indexed account);
    event ProjectApproved(string indexed projectId);

    constructor(
        address _communityNFT, 
        address _mrlnToken,
        address _offchainProcessor
    ) {
        require(_offchainProcessor != address(0), "Invalid processor address");
        
        communityNFT = IERC721(_communityNFT);
        mrlnToken = IERC20(_mrlnToken);
        offchainProcessor = _offchainProcessor;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(CORE_TEAM_ROLE, msg.sender);
        _grantRole(SUPER_ADMIN_ROLE, msg.sender);
        _grantRole(OFFCHAIN_PROCESSOR_ROLE, _offchainProcessor);

        _setRoleAdmin(OFFCHAIN_PROCESSOR_ROLE, SUPER_ADMIN_ROLE);
    }

    function updateOffchainProcessor(address newProcessor) external onlyRole(SUPER_ADMIN_ROLE) {
        address oldProcessor = getOffchainProcessor();
        _revokeRole(OFFCHAIN_PROCESSOR_ROLE, oldProcessor);
        _grantRole(OFFCHAIN_PROCESSOR_ROLE, newProcessor);
        emit OffchainProcessorUpdated(oldProcessor, newProcessor);
    }

    function pause() external onlyRole(SUPER_ADMIN_ROLE) {
        _pause();
        emit DAOPaused(msg.sender);
    }

    function unpause() external onlyRole(SUPER_ADMIN_ROLE) {
        _unpause();
        emit DAOUnpaused(msg.sender);
    }

    function getOffchainProcessor() public view virtual returns (address) {
        address processor = offchainProcessor;
        require(processor != address(0) && hasRole(OFFCHAIN_PROCESSOR_ROLE, processor), "No offchain processor set");
        return processor;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function submitProject(string calldata projectId, uint256 fundingGoal) external payable nonReentrant whenNotPaused {
        require(msg.value == SUBMISSION_FEE, "Incorrect submission fee");
        require(!projects[projectId].exists, "Project already exists");
        require(fundingGoal > 0, "Invalid funding goal");

        projects[projectId] = Project({
            id: projectId,
            owner: msg.sender,
            fundingGoal: fundingGoal,
            currentFunding: 0,
            exists: true,
            approved: false
        });

        emit ProjectSubmitted(projectId, msg.sender, fundingGoal);
    }

    function contributeToProject(string calldata projectId, uint256 amount) external nonReentrant whenNotPaused {
        require(projects[projectId].exists, "Project does not exist");
        require(projects[projectId].approved, "Project not approved");
        require(amount > 0, "Invalid contribution amount");

        Project storage project = projects[projectId];
        require(project.currentFunding + amount <= project.fundingGoal, "Exceeds funding goal");

        require(mrlnToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        project.currentFunding += amount;

        emit ProjectContribution(projectId, msg.sender, amount);
    }

    function startVotingRound(string[] memory _projects, address[] memory voters) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(_projects.length > 0, "No projects provided");
        require(voters.length > 0, "No voters provided");
        
        currentVotingRound++;
        
        // Store projects using index mapping
        for (uint256 i = 0; i < _projects.length; i++) {
            roundProjects[currentVotingRound][i] = _projects[i];
        }
        
        roundExists[currentVotingRound] = true;

        votingRoundInfo[currentVotingRound] = VotingRound({
            startTime: block.timestamp,
            endTime: block.timestamp + VOTING_DURATION,
            isActive: true,
            projectCount: _projects.length
        });

        for (uint256 i = 0; i < voters.length; i++) {
            ProposalList proposalList = new ProposalList(
                address(this),
                currentVotingRound,
                _projects,
                voters[i]
            );
            votingRounds[currentVotingRound][voters[i]] = proposalList;
        }

        emit VotingRoundStarted(currentVotingRound, _projects);
    }

    function submitVote(uint256 roundId, string[] calldata topProjects) external whenNotPaused {
        require(roundExists[roundId], "Round does not exist");
        ProposalList proposalList = votingRounds[roundId][msg.sender];
        require(address(proposalList) != address(0), "Not authorized to vote");
        require(proposalList.owner() == msg.sender, "Not the owner of proposal list");
        
        proposalList.vote(topProjects);
        emit VoteSubmitted(roundId, msg.sender, topProjects);
    }

    function getVoterProposalList(uint256 roundId, address voter) external view returns (address) {
        return address(votingRounds[roundId][voter]);
    }

    function getRoundProjects(uint256 roundId) external view returns (string[] memory) {
        require(roundExists[roundId], "Round does not exist");
        VotingRound memory round = votingRoundInfo[roundId];
        string[] memory projectsList = new string[](round.projectCount);
        
        for (uint256 i = 0; i < round.projectCount; i++) {
            projectsList[i] = roundProjects[roundId][i];
        }
        
        return projectsList;
    }

    function setOffchainProcessor(address _processor) external onlyRole(ADMIN_ROLE) {
        require(_processor != address(0), "Invalid processor address");
        offchainProcessor = _processor;
        _grantRole(OFFCHAIN_PROCESSOR_ROLE, _processor);
    }

    function approveProject(string memory projectId) external onlyRole(OFFCHAIN_PROCESSOR_ROLE) {
        require(projects[projectId].exists, "Project does not exist");
        require(!projects[projectId].approved, "Project already approved");
        
        projects[projectId].approved = true;
        emit ProjectApproved(projectId);
    }

    function getVotingPower(address voter) public view returns (uint256) {
        return communityNFT.balanceOf(voter);
    }

    function getProjectDetails(string calldata projectId) external view returns (
        string memory id,
        bool isActive,
        uint256 receivedFunding
    ) {
        Project storage project = projects[projectId];
        return (
            project.id,
            project.approved,
            project.currentFunding
        );
    }

    function getCurrentVotingStatus() external view returns (
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