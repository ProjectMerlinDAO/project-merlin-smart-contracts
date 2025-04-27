// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./ProposalList.sol";
import "./FinalistList.sol";
import "./FinalistVoting.sol";
import "./ProjectManagement.sol";
import "./VotingRoundManagement.sol";
import "./FinalistVotingLib.sol";
import "./FinalistVotingManager.sol";

contract ProjectDAO is AccessControl, ReentrancyGuard, Pausable {
    using ProjectManagement for mapping(string => ProjectManagement.Project);
    using VotingRoundManagement for mapping(uint256 => VotingRoundManagement.VotingRound);
    using FinalistVotingLib for FinalistVotingLib.VotingState;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CORE_TEAM_ROLE = keccak256("CORE_TEAM_ROLE");
    bytes32 public constant SUPER_ADMIN_ROLE = keccak256("SUPER_ADMIN_ROLE");

    IERC721 public communityNFT;
    IERC20 public mrlnToken;

    mapping(string => ProjectManagement.Project) public projects;
    mapping(uint256 => mapping(address => ProposalList)) public votingRounds;
    mapping(uint256 => mapping(uint256 => string)) public roundProjects;
    mapping(uint256 => bool) public roundExists;
    mapping(uint256 => VotingRoundManagement.VotingRound) public votingRoundInfo;
    
    uint256 public currentVotingRound;
    uint256 public constant VOTING_DURATION = 7 days;
    uint256 public constant SUBMISSION_FEE = 0.1 ether;
    
    uint256 public constant MIN_VOTING_POWER = 1;
    uint256 public constant RAVEN_MESSAGE_FEE = 100 * 10**18; // 100 MRLN
    uint256 public constant PROJECTS_PER_LIST = 5;
    uint256 public constant LIST_EXPIRY_TIME = 7 days;

    // Reassignment tracking
    mapping(uint256 => bool) public roundOneCompleted;
    mapping(uint256 => bool) public roundTwoCompleted;
    mapping(uint256 => mapping(address => address)) public reassignedVoters;
    mapping(uint256 => uint256) public roundEndTime;
    
    uint256 public constant ROUND_ONE_DURATION = 7 days;
    uint256 public constant ROUND_TWO_DURATION = 3 days;
    uint256 public constant ROUND_THREE_DURATION = 3 days;

    // Voter tracking
    mapping(uint256 => address[]) public roundVoters;

    // List type related constants and storage
    uint256 public constant PROJECTS_PER_LIST_TYPE = 5;
    uint256 public constant LIST_TYPES_THRESHOLD_1 = 20;
    uint256 public constant LIST_TYPES_THRESHOLD_2 = 50;
    uint256 public constant LIST_TYPES_THRESHOLD_3 = 100;
    uint256 public constant MAX_LIST_TYPES_TIER_1 = 4;
    uint256 public constant MAX_LIST_TYPES_TIER_2 = 8;
    uint256 public constant MAX_LIST_TYPES_TIER_3 = 16;
    uint256 public constant FINALIST_LIST_COUNT = 3;
    uint256 public constant PROJECTS_IN_FINAL = 9;
    uint256 public constant PROJECTS_PER_FINALIST_LIST = 3;
    uint256 public constant FINALISTS_PER_LIST_TIER_1 = 2;
    uint256 public constant FINALISTS_PER_LIST_TIER_2 = 3;
    uint256 public constant FINALISTS_PER_LIST_TIER_3 = 4;
    
    mapping(uint256 => mapping(address => uint256)) public voterListTypes;
    mapping(uint256 => uint256) public roundListTypeCount;

    // Finalist voting
    FinalistVotingManager public finalistVotingManager;

    event ProjectSubmitted(string indexed projectId, address indexed owner, uint256 fundingGoal);
    event ProjectContribution(string indexed projectId, address indexed contributor, uint256 amount);
    event VotingRoundStarted(uint256 indexed roundId, string[] projects);
    event VoteSubmitted(uint256 indexed roundId, address indexed voter, string[] topProjects);
    event ProposalListAssigned(address indexed voter, address indexed proposalList);
    event ProposalListReassigned(uint256 indexed roundId, address indexed originalVoter, address indexed newVoter);
    event DAOPaused(address indexed account);
    event DAOUnpaused(address indexed account);
    event RoundOneCompleted(uint256 indexed roundId, uint256 timestamp);
    event RoundTwoCompleted(uint256 indexed roundId, uint256 timestamp);
    event AIRoundTriggered(uint256 indexed roundId, uint256 timestamp);
    event FinalistVotingStarted(uint256 indexed roundId, uint256 timestamp);
    event FinalistVotingEnded(uint256 indexed roundId, uint256 timestamp);
    event WinnersSelected(uint256 indexed roundId, string[] winners);

    constructor(
        address _communityNFT, 
        address _mrlnToken
    ) {
        communityNFT = IERC721(_communityNFT);
        mrlnToken = IERC20(_mrlnToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(CORE_TEAM_ROLE, msg.sender);
        _grantRole(SUPER_ADMIN_ROLE, msg.sender);

        finalistVotingManager = new FinalistVotingManager(address(this));
    }

    function pause() external onlyRole(SUPER_ADMIN_ROLE) {
        _pause();
        emit DAOPaused(msg.sender);
    }

    function unpause() external onlyRole(SUPER_ADMIN_ROLE) {
        _unpause();
        emit DAOUnpaused(msg.sender);
    }

    function submitProject(
        string calldata projectId, 
        uint256 fundingGoal,
        string calldata title,
        string calldata description,
        string calldata shortBrief,
        string calldata imageUri
    ) external payable nonReentrant whenNotPaused {
        require(msg.value == SUBMISSION_FEE, "Incorrect submission fee");
        ProjectManagement.createProject(
            projects, 
            projectId, 
            msg.sender, 
            fundingGoal,
            title,
            description,
            shortBrief,
            imageUri
        );
        emit ProjectSubmitted(projectId, msg.sender, fundingGoal);
    }

    function contributeToProject(string calldata projectId, uint256 amount) external nonReentrant whenNotPaused {
        ProjectManagement.contributeToProject(projects, projectId, amount);
        require(mrlnToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit ProjectContribution(projectId, msg.sender, amount);
    }

    function startVotingRound(string[] memory _projects, address[] memory voters) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(voters.length > 0, "No voters");
        
        // Check participation count for each project
        for (uint256 i = 0; i < _projects.length; i++) {
            string memory projectId = _projects[i];
            uint256 participationCount = ProjectManagement.getParticipationCount(projects, projectId);
            require(participationCount < 3, "Project already participated in 3 voting rounds");
            ProjectManagement.incrementParticipationCount(projects, projectId);
        }
        
        currentVotingRound++;
        
        VotingRoundManagement.createVotingRound(
            votingRoundInfo,
            roundProjects,
            roundExists,
                currentVotingRound,
                _projects,
            VOTING_DURATION
        );

        roundVoters[currentVotingRound] = voters;
        roundEndTime[currentVotingRound] = block.timestamp + ROUND_ONE_DURATION;

        VotingRoundManagement.createProposalLists(
            votingRounds,
            currentVotingRound,
            voters,
            _projects,
            address(this)
        );

        emit VotingRoundStarted(currentVotingRound, _projects);
    }

    function submitVote(uint256 roundId, string[] calldata topProjects) external whenNotPaused {
        require(roundExists[roundId], "No round");
        address proposalListAddress = address(votingRounds[roundId][msg.sender]);
        require(proposalListAddress != address(0), "Not authorized to vote");
        
        ProposalList proposalList = ProposalList(proposalListAddress);
        require(proposalList.owner() == msg.sender, "Not owner");
        require(proposalList.dao() == address(this), "Wrong DAO");
        require(proposalList.votingRound() == roundId, "Wrong round");
        
        proposalList.vote(topProjects);
        emit VoteSubmitted(roundId, msg.sender, topProjects);
    }

    function completeRoundOne(uint256 roundId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(roundExists[roundId], "No round");
        require(!roundOneCompleted[roundId], "Already done");
        require(block.timestamp >= roundEndTime[roundId], "Not ended");
        
        address[] memory currentRoundVoters = roundVoters[roundId];
        uint256 activeVoterCount = 0;
        address[] memory activeVoters = new address[](100);
        
        for (uint256 i = 0; i < currentRoundVoters.length; i++) {
            address voter = currentRoundVoters[i];
            ProposalList proposalList = votingRounds[roundId][voter];
            
            if (proposalList.voted()) {
                if (activeVoterCount < activeVoters.length) {
                    activeVoters[activeVoterCount] = voter;
                    activeVoterCount++;
                }
            }
        }
        
        require(activeVoterCount > 0, "No voters");
        
        uint256 reassignmentIndex = 0;
        for (uint256 i = 0; i < currentRoundVoters.length; i++) {
            address voter = currentRoundVoters[i];
            ProposalList proposalList = votingRounds[roundId][voter];
            
            if (!proposalList.voted()) {
                address newVoter = activeVoters[reassignmentIndex % activeVoterCount];
                reassignmentIndex++;
                
                proposalList.transferOwnership(newVoter);
                reassignedVoters[roundId][voter] = newVoter;
                
                emit ProposalListReassigned(roundId, voter, newVoter);
            }
        }
        
        roundOneCompleted[roundId] = true;
        roundEndTime[roundId] = block.timestamp + ROUND_TWO_DURATION;
        emit RoundOneCompleted(roundId, block.timestamp);
    }

    function completeRoundTwo(uint256 roundId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(roundExists[roundId], "No round");
        require(roundOneCompleted[roundId], "Round 1 not done");
        require(!roundTwoCompleted[roundId], "Already done");
        require(block.timestamp >= roundEndTime[roundId], "Not ended");
        
        address[] memory activeVoters = new address[](100);
        uint256 activeVoterCount = 0;
        
        address[] memory allVoters = roundVoters[roundId];
        for (uint256 i = 0; i < allVoters.length; i++) {
            address voter = allVoters[i];
            ProposalList proposalList = votingRounds[roundId][voter];
            
            if (proposalList.voted()) {
                if (activeVoterCount < activeVoters.length) {
                    activeVoters[activeVoterCount] = voter;
                    activeVoterCount++;
                }
            }
        }
        
        require(activeVoterCount > 0, "No voters");
        
        uint256 reassignmentIndex = 0;
        for (uint256 i = 0; i < allVoters.length; i++) {
            address voter = allVoters[i];
            ProposalList proposalList = votingRounds[roundId][voter];
            
            if (!proposalList.voted()) {
                address newVoter = activeVoters[reassignmentIndex % activeVoterCount];
                reassignmentIndex++;
                
                proposalList.transferOwnership(newVoter);
                reassignedVoters[roundId][voter] = newVoter;
                
                emit ProposalListReassigned(roundId, voter, newVoter);
            }
        }
        
        roundTwoCompleted[roundId] = true;
        roundEndTime[roundId] = block.timestamp + ROUND_THREE_DURATION;
        emit RoundTwoCompleted(roundId, block.timestamp);
    }

    function triggerAIRound(uint256 roundId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(roundExists[roundId], "No round");
        require(roundTwoCompleted[roundId], "Round 2 not done");
        require(block.timestamp >= roundEndTime[roundId], "Not ended");
        emit AIRoundTriggered(roundId, block.timestamp);
    }

    function startVotingRoundWithListTypes(string[] memory _projects, address[] memory voters) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(_projects.length > 0, "No projects");
        require(voters.length > 0, "No voters");
        
        // Check participation count for each project
        for (uint256 i = 0; i < _projects.length; i++) {
            string memory projectId = _projects[i];
            uint256 participationCount = ProjectManagement.getParticipationCount(projects, projectId);
            require(participationCount < 3, "Project already participated in 3 voting rounds");
            ProjectManagement.incrementParticipationCount(projects, projectId);
        }
        
        currentVotingRound++;
        
        VotingRoundManagement.createVotingRound(
            votingRoundInfo,
            roundProjects,
            roundExists,
            currentVotingRound,
            _projects,
            VOTING_DURATION
        );

        roundVoters[currentVotingRound] = voters;
        roundEndTime[currentVotingRound] = block.timestamp + ROUND_ONE_DURATION;
        
        uint256 listTypeCount = determineListTypeCount(_projects.length);
        roundListTypeCount[currentVotingRound] = listTypeCount;
        
        uint256 votersPerListType = voters.length / listTypeCount;
        uint256 remainder = voters.length % listTypeCount;
        uint256 voterIndex = 0;
        
        for (uint256 listType = 0; listType < listTypeCount; listType++) {
            uint256 votersForThisType = votersPerListType;
            if (listType < remainder) votersForThisType++;
            
            string[] memory listProjects = getProjectsForListType(_projects, listType, listTypeCount);
            
            for (uint256 i = 0; i < votersForThisType && voterIndex < voters.length; i++) {
                address voter = voters[voterIndex];
                voterListTypes[currentVotingRound][voter] = listType;
                
                ProposalList proposalList = new ProposalList(
                    address(this),
                    currentVotingRound,
                    listProjects,
                    voter
                );
                
                votingRounds[currentVotingRound][voter] = proposalList;
                voterIndex++;
            }
        }

        emit VotingRoundStarted(currentVotingRound, _projects);
    }

    function determineListTypeCount(uint256 projectCount) internal pure returns (uint256) {
        if (projectCount < LIST_TYPES_THRESHOLD_1) {
            uint256 count = projectCount / PROJECTS_PER_LIST_TYPE;
            return count + (projectCount % PROJECTS_PER_LIST_TYPE > 0 ? 1 : 0);
        } else if (projectCount <= LIST_TYPES_THRESHOLD_2) {
            return projectCount / PROJECTS_PER_LIST_TYPE + (projectCount % PROJECTS_PER_LIST_TYPE > 0 ? 1 : 0);
        } else if (projectCount < LIST_TYPES_THRESHOLD_3) {
            return 8;
        } else {
            return 16;
        }
    }

    function getProjectsForListType(
        string[] memory allProjects,
        uint256 listType,
        uint256 totalListTypes
    ) internal pure returns (string[] memory) {
        uint256 projectsPerListType = allProjects.length / totalListTypes;
        if (projectsPerListType > PROJECTS_PER_LIST_TYPE) {
            projectsPerListType = PROJECTS_PER_LIST_TYPE;
        }
        
        uint256 startIndex = listType * projectsPerListType;
        string[] memory listProjects;
        
        if (listType == totalListTypes - 1 && startIndex + projectsPerListType > allProjects.length) {
            uint256 remaining = allProjects.length - startIndex;
            listProjects = new string[](remaining > 0 ? remaining : 1);
            
            for (uint256 i = 0; i < remaining && i < listProjects.length; i++) {
                listProjects[i] = allProjects[startIndex + i];
            }
        } else {
            listProjects = new string[](projectsPerListType > 0 ? projectsPerListType : 1);
            
            for (uint256 i = 0; i < projectsPerListType && i < listProjects.length && startIndex + i < allProjects.length; i++) {
                listProjects[i] = allProjects[startIndex + i];
            }
        }
        
        return listProjects;
    }

    function getVoterProjects(uint256 roundId, address voter) external view returns (string[] memory) {
        require(roundExists[roundId], "No round");
        ProposalList proposalList = votingRounds[roundId][voter];
        require(address(proposalList) != address(0), "No list");
        return proposalList.getAllAvailableProjects();
    }

    function startFinalistVoting(uint256 roundId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(roundExists[roundId], "No round");
        require(roundTwoCompleted[roundId], "R2 not done");
        
        address[] memory currentRoundVoters = roundVoters[roundId];
        uint256 currentListTypeCount = roundListTypeCount[roundId];
        
        // Update voter data in the manager
        for (uint256 i = 0; i < currentRoundVoters.length; i++) {
            address voter = currentRoundVoters[i];
            finalistVotingManager.updateVoterData(
                roundId,
                voter,
                voterListTypes[roundId][voter],
                address(votingRounds[roundId][voter])
            );
        }
        
        // Get all projects for this round
        string[] memory roundProjectsList = new string[](votingRoundInfo[roundId].projectCount);
        for (uint256 i = 0; i < votingRoundInfo[roundId].projectCount; i++) {
            roundProjectsList[i] = roundProjects[roundId][i];
        }
        
        finalistVotingManager.startFinalistVoting(
            roundId,
            currentRoundVoters,
            currentListTypeCount,
            roundProjectsList,
            votingRoundInfo[roundId].projectCount
        );
    }

    function submitFinalistVote(uint256 roundId, string[] calldata topProjects) external whenNotPaused {
        finalistVotingManager.submitFinalistVote(roundId, topProjects);
    }

    function endFinalistVoting(uint256 roundId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        finalistVotingManager.endFinalistVoting(roundId);
    }

    function getFinalistVotingList(uint256 roundId, address voter) external view returns (address) {
        return finalistVotingManager.getFinalistVotingList(roundId, voter);
    }

    function getRoundWinners(uint256 roundId) external view returns (string[] memory) {
        return finalistVotingManager.getRoundWinners(roundId);
    }

    function getVotingPower(address voter) public view returns (uint256) {
        return communityNFT.balanceOf(voter);
    }

    function getProjectDetails(string calldata projectId) external view returns (
        string memory id,
        bool isActive,
        uint256 receivedFunding,
        string memory title,
        string memory description,
        string memory shortBrief,
        string memory imageUri
    ) {
        return ProjectManagement.getProjectDetails(projects, projectId);
    }

    function getCurrentVotingStatus() external view returns (
        bool isActive,
        uint256 startTime,
        uint256 endTime,
        string[] memory projectIds
    ) {
        return VotingRoundManagement.getCurrentVotingStatus(
            votingRoundInfo,
            roundProjects,
            currentVotingRound
        );
    }

    function getVoterProposalList(uint256 roundId, address voter) external view returns (address) {
        return address(votingRounds[roundId][voter]);
    }

    function getRoundProjects(uint256 roundId) external view returns (string[] memory) {
        return VotingRoundManagement.getRoundProjects(
            roundExists,
            votingRoundInfo,
            roundProjects,
            roundId
        );
    }

    function getProjectParticipationCount(string calldata projectId) external view returns (uint256) {
        return ProjectManagement.getParticipationCount(projects, projectId);
    }
} 