import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  ProjectDAO, 
  CommunityNFT,
  TokenManager,
  ProposalList
} from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ProjectDAO", function () {
  let projectDAO: ProjectDAO;
  let communityNFT: CommunityNFT;
  let tokenManager: TokenManager;
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let projectOwner: SignerWithAddress;
  let offchainProcessor: SignerWithAddress;

  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const CORE_TEAM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CORE_TEAM_ROLE"));
  const SUPER_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SUPER_ADMIN_ROLE"));
  const OFFCHAIN_PROCESSOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OFFCHAIN_PROCESSOR_ROLE"));

  const SUBMISSION_FEE = ethers.parseEther("0.1");
  const PROJECT_ID = "project-1";
  const FUNDING_GOAL = ethers.parseEther("100");
  
  // TokenManager constants
  const TOKEN_NAME = "Merlin";
  const TOKEN_SYMBOL = "MRLN";
  const TOTAL_SUPPLY = ethers.parseEther("800000000");
  const BRIDGE_AMOUNT = ethers.parseEther("100000000");
  const TRANSFER_FEE = 100n; // 1% (100 basis points)
  const OPERATION_FEE = ethers.parseEther("1"); // 1 MRLN token

  beforeEach(async function () {
    [owner, admin, voter1, voter2, projectOwner, offchainProcessor] = await ethers.getSigners();

    // Deploy TokenManager first
    const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
    tokenManager = await TokenManagerFactory.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOTAL_SUPPLY,
      BRIDGE_AMOUNT,
      TRANSFER_FEE,
      OPERATION_FEE
    );
    await tokenManager.waitForDeployment();

    // Deploy CommunityNFT with TokenManager address
    const CommunityNFTFactory = await ethers.getContractFactory("CommunityNFT");
    communityNFT = await CommunityNFTFactory.deploy(await tokenManager.getAddress());
    await communityNFT.waitForDeployment();

    // Deploy ProjectDAO
    const ProjectDAOFactory = await ethers.getContractFactory("ProjectDAO");
    projectDAO = await ProjectDAOFactory.deploy(
      await communityNFT.getAddress(),
      await tokenManager.getAddress(),
      offchainProcessor.address
    );
    await projectDAO.waitForDeployment();

    // Setup roles
    await projectDAO.grantRole(ADMIN_ROLE, admin.address);
    await projectDAO.grantRole(CORE_TEAM_ROLE, admin.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner and roles", async function () {
      expect(await projectDAO.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await projectDAO.hasRole(CORE_TEAM_ROLE, admin.address)).to.be.true;
      expect(await projectDAO.hasRole(SUPER_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await projectDAO.hasRole(OFFCHAIN_PROCESSOR_ROLE, offchainProcessor.address)).to.be.true;
    });

    it("Should set the correct token addresses", async function () {
      expect(await projectDAO.communityNFT()).to.equal(await communityNFT.getAddress());
      expect(await projectDAO.mrlnToken()).to.equal(await tokenManager.getAddress());
    });
  });

  describe("Project Submission", function () {
    it("Should allow project submission with correct fee", async function () {
      await expect(projectDAO.connect(projectOwner).submitProject(PROJECT_ID, FUNDING_GOAL, {
        value: SUBMISSION_FEE
      }))
        .to.emit(projectDAO, "ProjectSubmitted")
        .withArgs(PROJECT_ID, projectOwner.address, FUNDING_GOAL);

      const project = await projectDAO.projects(PROJECT_ID);
      expect(project.owner).to.equal(projectOwner.address);
      expect(project.fundingGoal).to.equal(FUNDING_GOAL);
      expect(project.exists).to.be.true;
      expect(project.approved).to.be.false;
    });

    it("Should reject project submission with incorrect fee", async function () {
      await expect(projectDAO.connect(projectOwner).submitProject(
        PROJECT_ID, 
        FUNDING_GOAL, 
        { value: ethers.parseEther("0.05") }
      )).to.be.revertedWith("Incorrect submission fee");
    });

    it("Should reject duplicate project submissions", async function () {
      await projectDAO.connect(projectOwner).submitProject(PROJECT_ID, FUNDING_GOAL, {
        value: SUBMISSION_FEE
      });

      await expect(projectDAO.connect(projectOwner).submitProject(
        PROJECT_ID, 
        FUNDING_GOAL, 
        { value: SUBMISSION_FEE }
      )).to.be.revertedWith("Project already exists");
    });
  });

  describe("Project Approval", function () {
    beforeEach(async function () {
      await projectDAO.connect(projectOwner).submitProject(PROJECT_ID, FUNDING_GOAL, {
        value: SUBMISSION_FEE
      });
    });

    it("Should allow offchain processor to approve project", async function () {
      await expect(projectDAO.connect(offchainProcessor).approveProject(PROJECT_ID))
        .to.emit(projectDAO, "ProjectApproved")
        .withArgs(PROJECT_ID);

      const project = await projectDAO.projects(PROJECT_ID);
      expect(project.approved).to.be.true;
    });

    it("Should reject approval from non-processor", async function () {
      await expect(projectDAO.connect(admin).approveProject(PROJECT_ID))
        .to.be.revertedWith(
          `AccessControl: account ${admin.address.toLowerCase()} is missing role ${OFFCHAIN_PROCESSOR_ROLE}`
        );
    });
  });

  describe("Voting Rounds", function () {
    const projects = ["project-1", "project-2", "project-3"];
    
    beforeEach(async function () {
      // Submit all projects
      for (const projectId of projects) {
        await projectDAO.connect(projectOwner).submitProject(projectId, FUNDING_GOAL, {
          value: SUBMISSION_FEE
        });
        await projectDAO.connect(offchainProcessor).approveProject(projectId);
      }

      // Setup NFT minting
      const NFT_MINT_PRICE = ethers.parseEther("1000"); // 1000 MRLN
      await tokenManager.transfer(voter1.address, NFT_MINT_PRICE);
      await tokenManager.transfer(voter2.address, NFT_MINT_PRICE);
      
      await tokenManager.connect(voter1).approve(await communityNFT.getAddress(), NFT_MINT_PRICE);
      await tokenManager.connect(voter2).approve(await communityNFT.getAddress(), NFT_MINT_PRICE);

      // Mint NFTs to voters
      await communityNFT.connect(voter1).safeMint(voter1.address);
      await communityNFT.connect(voter2).safeMint(voter2.address);
    });

    it("Should start a new voting round and create proposal lists", async function () {
      const voters = [voter1.address, voter2.address];
      
      await expect(projectDAO.connect(admin).startVotingRound(projects, voters))
        .to.emit(projectDAO, "VotingRoundStarted")
        .withArgs(1, projects);

      // Verify round projects
      const roundProjects = await projectDAO.getRoundProjects(1);
      expect(roundProjects).to.deep.equal(projects);

      // Verify voting round info
      const votingRound = await projectDAO.votingRoundInfo(1);
      expect(votingRound.isActive).to.be.true;
      expect(votingRound.endTime).to.equal(votingRound.startTime + BigInt(7 * 24 * 60 * 60)); // 7 days

      // Verify proposal list creation and ownership for each voter
      for (const voter of voters) {
        const proposalListAddress = await projectDAO.getVoterProposalList(1, voter);
        expect(proposalListAddress).to.not.equal(ethers.ZeroAddress);

        const proposalList = await ethers.getContractAt("ProposalList", proposalListAddress);
        expect(await proposalList.owner()).to.equal(voter);
        
        // Verify available projects in proposal list
        const availableProjects = await proposalList.getAllAvailableProjects();
        expect(availableProjects).to.deep.equal(projects);
      }
    });

    it("Should allow voters to submit votes through their proposal lists", async function () {
      const voters = [voter1.address, voter2.address];
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Get voter1's proposal list
      const proposalListAddress = await projectDAO.getVoterProposalList(1, voter1.address);
      const proposalList = await ethers.getContractAt("ProposalList", proposalListAddress);
      
      // Verify initial state
      expect(await proposalList.owner()).to.equal(voter1.address);
      expect(await proposalList.voted()).to.be.false;
      
      // Submit vote directly through the proposal list
      const selectedProjects = ["project-1", "project-2"];
      await proposalList.connect(voter1).vote(selectedProjects);
      
      // Verify vote was recorded
      expect(await proposalList.voted()).to.be.true;
      
      // Get selected projects using the DAO
      const votedProjects = await proposalList.connect(voter1).getSelectedProjects(selectedProjects.length);
      expect(votedProjects).to.deep.equal(selectedProjects);
      
      // Verify cannot vote again
      await expect(proposalList.connect(voter1).vote(selectedProjects))
        .to.be.revertedWith("Already voted");
    });

    it("Should reject votes from non-authorized voters", async function () {
      const voters = [voter1.address];
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Verify voter2 doesn't have a proposal list
      const proposalListAddress = await projectDAO.getVoterProposalList(1, voter2.address);
      expect(proposalListAddress).to.equal(ethers.ZeroAddress);
      
      // Try to vote with voter2
      await expect(projectDAO.connect(voter2).submitVote(1, ["project-1"]))
        .to.be.revertedWith("Not authorized to vote");
    });

    it("Should reject votes after voting window expires", async function () {
      const voters = [voter1.address];
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Get voter1's proposal list
      const proposalListAddress = await projectDAO.getVoterProposalList(1, voter1.address);
      const proposalList = await ethers.getContractAt("ProposalList", proposalListAddress);
      
      // Fast forward past voting window (7 days + 1 second)
      await time.increase(7 * 24 * 60 * 60 + 1);
      
      // Try to vote directly through the proposal list
      await expect(proposalList.connect(voter1).vote(["project-1"]))
        .to.be.revertedWith("Voting window expired");
    });
  });

  describe("Project Funding", function () {
    beforeEach(async function () {
      await projectDAO.connect(projectOwner).submitProject(PROJECT_ID, FUNDING_GOAL, {
        value: SUBMISSION_FEE
      });
      await projectDAO.connect(offchainProcessor).approveProject(PROJECT_ID);
      
      // Transfer tokens to voter1 for testing
      await tokenManager.transfer(voter1.address, FUNDING_GOAL);
      await tokenManager.connect(voter1).approve(await projectDAO.getAddress(), FUNDING_GOAL);
    });

    it("Should allow contribution to approved project", async function () {
      const contributionAmount = ethers.parseEther("50");
      
      await expect(projectDAO.connect(voter1).contributeToProject(PROJECT_ID, contributionAmount))
        .to.emit(projectDAO, "ProjectContribution")
        .withArgs(PROJECT_ID, voter1.address, contributionAmount);

      const project = await projectDAO.projects(PROJECT_ID);
      expect(project.currentFunding).to.equal(contributionAmount);
    });

    it("Should reject contribution exceeding funding goal", async function () {
      const excessAmount = FUNDING_GOAL + ethers.parseEther("1");
      
      await expect(projectDAO.connect(voter1).contributeToProject(PROJECT_ID, excessAmount))
        .to.be.revertedWith("Exceeds funding goal");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow super admin to pause/unpause", async function () {
      await expect(projectDAO.connect(owner).pause())
        .to.emit(projectDAO, "DAOPaused")
        .withArgs(owner.address);

      await expect(projectDAO.connect(owner).unpause())
        .to.emit(projectDAO, "DAOUnpaused")
        .withArgs(owner.address);
    });

    it("Should allow super admin to update offchain processor", async function () {
      const newProcessor = voter1.address;
      
      await expect(projectDAO.connect(owner).updateOffchainProcessor(newProcessor))
        .to.emit(projectDAO, "OffchainProcessorUpdated")
        .withArgs(offchainProcessor.address, newProcessor);

      expect(await projectDAO.hasRole(OFFCHAIN_PROCESSOR_ROLE, newProcessor)).to.be.true;
      expect(await projectDAO.hasRole(OFFCHAIN_PROCESSOR_ROLE, offchainProcessor.address)).to.be.false;
    });
  });
}); 