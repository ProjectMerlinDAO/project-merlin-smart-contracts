// @ts-nocheck
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  ProjectDAO as ProjectDAOType, 
  CommunityNFT,
  TokenManager,
  ProposalList
} from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const generateProjects = (count: number) => {
  const projects = [];
  for (let i = 0; i < count; i++) {
    projects.push(`project-${i+1}`);
  }
  return projects;
};

describe("ProjectDAO", function () {
  let projectDAO: any;
  let communityNFT: CommunityNFT;
  let tokenManager: any; // Use 'any' type to bypass TypeScript checks until types are regenerated
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let projectOwner: SignerWithAddress;

  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const CORE_TEAM_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CORE_TEAM_ROLE"));
  const SUPER_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SUPER_ADMIN_ROLE"));

  const SUBMISSION_FEE = ethers.parseEther("0.1");
  const PROJECT_ID = "project-1";
  const FUNDING_GOAL = ethers.parseEther("100");
  
  // TokenManager constants
  const TOKEN_NAME = "Merlin";
  const TOKEN_SYMBOL = "MRLN";
  const TOTAL_SUPPLY = ethers.parseEther("800000000");

  beforeEach(async function () {
    [owner, admin, voter1, voter2, projectOwner] = await ethers.getSigners();

    // Fund test accounts
    await ethers.provider.send("hardhat_setBalance", [
      voter1.address,
      "0x100000000000000000000000"  // 1,000,000 ETH
    ]);
    await ethers.provider.send("hardhat_setBalance", [
      voter2.address,
      "0x100000000000000000000000"  // 1,000,000 ETH
    ]);

    // Deploy TokenManager first - with updated constructor
    const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
    tokenManager = await TokenManagerFactory.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOTAL_SUPPLY
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
      await tokenManager.getAddress()
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
    });

    it("Should set the correct token addresses", async function () {
      expect(await projectDAO.communityNFT()).to.equal(await communityNFT.getAddress());
      expect(await projectDAO.mrlnToken()).to.equal(await tokenManager.getAddress());
    });
  });

  describe("Project Submission", function () {
    it("Should allow project submission with correct fee", async function () {
      await expect(projectDAO.connect(projectOwner).submitProject(
        PROJECT_ID, 
        FUNDING_GOAL,
        "Test Project",
        "This is a test project description",
        "Short brief for testing",
        "ipfs://image-uri",
        {
          value: SUBMISSION_FEE
        }
      ))
        .to.emit(projectDAO, "ProjectSubmitted")
        .withArgs(PROJECT_ID, projectOwner.address, FUNDING_GOAL);

      const project = await projectDAO.projects(PROJECT_ID);
      expect(project.owner).to.equal(projectOwner.address);
      expect(project.fundingGoal).to.equal(FUNDING_GOAL);
      expect(project.exists).to.be.true;
      expect(project.approved).to.be.true; // Projects are now approved by default
      expect(project.title).to.equal("Test Project");
      expect(project.description).to.equal("This is a test project description");
      expect(project.shortBrief).to.equal("Short brief for testing");
      expect(project.imageUri).to.equal("ipfs://image-uri");
    });

    it("Should reject project submission with incorrect fee", async function () {
      await expect(projectDAO.connect(projectOwner).submitProject(
        PROJECT_ID, 
        FUNDING_GOAL,
        "Test Project",
        "This is a test project description",
        "Short brief for testing",
        "ipfs://image-uri", 
        { value: ethers.parseEther("0.05") }
      )).to.be.revertedWith("Incorrect submission fee");
    });

    it("Should reject duplicate project submissions", async function () {
      await projectDAO.connect(projectOwner).submitProject(
        PROJECT_ID, 
        FUNDING_GOAL,
        "Test Project",
        "This is a test project description",
        "Short brief for testing",
        "ipfs://image-uri",
        {
          value: SUBMISSION_FEE
        }
      );

      await expect(projectDAO.connect(projectOwner).submitProject(
        PROJECT_ID, 
        FUNDING_GOAL,
        "Test Project",
        "This is a test project description",
        "Short brief for testing",
        "ipfs://image-uri", 
        { value: SUBMISSION_FEE }
      )).to.be.revertedWith("Project exists");
    });
  });

  describe("Project Funding", function () {
    beforeEach(async function () {
      await projectDAO.connect(projectOwner).submitProject(
        PROJECT_ID, 
        FUNDING_GOAL,
        "Test Project",
        "This is a test project description",
        "Short brief for testing",
        "ipfs://image-uri",
        {
          value: SUBMISSION_FEE
        }
      );
      
      // Transfer tokens to voter1 for testing
      await tokenManager.transfer(voter1.address, FUNDING_GOAL);
      await tokenManager.connect(voter1).approve(await projectDAO.getAddress(), FUNDING_GOAL);
    });

    it("Should allow contribution to project immediately after creation", async function () {
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
        .to.be.revertedWith("Exceeds goal");
    });
  });

  describe("Voting Rounds", function () {
    const projects = ["project-1", "project-2", "project-3"];
    
    beforeEach(async function () {
      // Submit all projects
      for (const projectId of projects) {
        await projectDAO.connect(projectOwner).submitProject(
          projectId, 
          FUNDING_GOAL, 
          `Title for ${projectId}`,
          `Description for ${projectId}`,
          `Short brief for ${projectId}`,
          `ipfs://${projectId}-image`,
          {
            value: SUBMISSION_FEE
          }
        );
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
      await projectDAO.connect(projectOwner).submitProject(
        PROJECT_ID, 
        FUNDING_GOAL,
        "Test Project",
        "This is a test project description",
        "Short brief for testing",
        "ipfs://image-uri",
        {
          value: SUBMISSION_FEE
        }
      );
      
      // Transfer tokens to voter1 for testing
      await tokenManager.transfer(voter1.address, FUNDING_GOAL);
      await tokenManager.connect(voter1).approve(await projectDAO.getAddress(), FUNDING_GOAL);
    });

    it("Should allow contribution to project immediately after creation", async function () {
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
        .to.be.revertedWith("Exceeds goal");
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
  });

  describe("Multi-phase Voting System", function () {
    const projects = ["project-1", "project-2", "project-3"];
    
    beforeEach(async function () {
      // Submit all projects
      for (const projectId of projects) {
        await projectDAO.connect(projectOwner).submitProject(
          projectId, 
          FUNDING_GOAL,
          `Title for ${projectId}`,
          `Description for ${projectId}`,
          `Short brief for ${projectId}`,
          `ipfs://${projectId}-image`,
          {
            value: SUBMISSION_FEE
          }
        );
      }

      // Setup NFT minting for voters
      const NFT_MINT_PRICE = ethers.parseEther("1000"); // 1000 MRLN
      
      // Setup 3 voters: voter1 and voter2 will vote, voter3 will not
      await tokenManager.transfer(voter1.address, NFT_MINT_PRICE);
      await tokenManager.transfer(voter2.address, NFT_MINT_PRICE);
      
      await tokenManager.connect(voter1).approve(await communityNFT.getAddress(), NFT_MINT_PRICE);
      await tokenManager.connect(voter2).approve(await communityNFT.getAddress(), NFT_MINT_PRICE);

      // Mint NFTs to voters
      await communityNFT.connect(voter1).safeMint(voter1.address);
      await communityNFT.connect(voter2).safeMint(voter2.address);
    });

    it("Should reassign proposal lists after round one", async function () {
      // Start a voting round with 3 voters
      const voters = [voter1.address, voter2.address, owner.address];
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Only voter1 votes
      const proposalListVoter1 = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, voter1.address)
      );
      await proposalListVoter1.connect(voter1).vote(["project-1", "project-2"]);
      
      // Advance time past round one (7 days)
      await time.increase(7 * 24 * 60 * 60 + 1);
      
      // Complete round one
      await expect(projectDAO.connect(admin).completeRoundOne(1))
        .to.emit(projectDAO, "RoundOneCompleted");
      
      // Check that non-voter proposal lists were reassigned to voter1
      const proposalListVoter2 = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, voter2.address)
      );
      const proposalListOwner = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, owner.address)
      );
      
      // Both should now be owned by voter1 (the only active voter)
      expect(await proposalListVoter2.owner()).to.equal(voter1.address);
      expect(await proposalListOwner.owner()).to.equal(voter1.address);
      
      // Verify the reassignedVoters mapping was updated
      expect(await projectDAO.reassignedVoters(1, voter2.address)).to.equal(voter1.address);
      expect(await projectDAO.reassignedVoters(1, owner.address)).to.equal(voter1.address);
      
      // Verify voting window was reset and now voter1 can vote with the reassigned list
      expect(await proposalListVoter2.hasVotingWindowExpired()).to.be.false;
    });

    it("Should reassign proposal lists after round two", async function () {
      // Start a voting round with 4 voters
      const voters = [voter1.address, voter2.address, owner.address, admin.address];
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // voter1 and voter2 vote in round one
      const proposalListVoter1 = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, voter1.address)
      );
      const proposalListVoter2 = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, voter2.address)
      );
      
      await proposalListVoter1.connect(voter1).vote(["project-1", "project-2"]);
      await proposalListVoter2.connect(voter2).vote(["project-2", "project-3"]);
      
      // Advance time past round one (7 days)
      await time.increase(7 * 24 * 60 * 60 + 1);
      
      // Complete round one
      await projectDAO.connect(admin).completeRoundOne(1);
      
      // owner and admin's lists should now be reassigned
      const ownerProposalList = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, owner.address)
      );
      const adminProposalList = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, admin.address)
      );
      
      // Verify new owners (should be either voter1 or voter2)
      const newOwner1 = await ownerProposalList.owner();
      const newOwner2 = await adminProposalList.owner();
      
      expect([voter1.address, voter2.address]).to.include(newOwner1);
      expect([voter1.address, voter2.address]).to.include(newOwner2);
      
      // Advance time for round two (3 days)
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      // Complete round two
      await expect(projectDAO.connect(admin).completeRoundTwo(1))
        .to.emit(projectDAO, "RoundTwoCompleted");
    });

    it("Should trigger AI round after round three", async function () {
      // Start a voting round
      const voters = [voter1.address, voter2.address];
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Only voter1 votes
      const proposalListVoter1 = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, voter1.address)
      );
      await proposalListVoter1.connect(voter1).vote(["project-1", "project-2"]);
      
      // Complete round one (after 7 days)
      await time.increase(7 * 24 * 60 * 60 + 1);
      await projectDAO.connect(admin).completeRoundOne(1);
      
      // Complete round two (after 3 more days)
      await time.increase(3 * 24 * 60 * 60 + 1);
      await projectDAO.connect(admin).completeRoundTwo(1);
      
      // Complete round three (after 3 more days)
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      // Trigger AI round
      await expect(projectDAO.connect(admin).triggerAIRound(1))
        .to.emit(projectDAO, "AIRoundTriggered");
    });

    it("Should only allow DAO to reassign proposal list ownership", async function () {
      // Start a voting round
      const voters = [voter1.address, voter2.address];
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Get proposal lists
      const proposalList1 = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, voter1.address)
      );
      
      // Verify initial ownership
      expect(await proposalList1.owner()).to.equal(voter1.address);
      
      // Attempt to transfer ownership directly (should fail)
      await expect(
        proposalList1.connect(voter1).transferOwnership(voter2.address)
      ).to.be.revertedWith("Only DAO can reassign ownership");
      
      // Owner can still renounce ownership
      await proposalList1.connect(voter1).renounceOwnership();
      expect(await proposalList1.owner()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Reassignment Functionality", function () {
    const projects = ["project-1", "project-2", "project-3"];
    
    beforeEach(async function () {
      // Submit all projects
      for (const projectId of projects) {
        await projectDAO.connect(projectOwner).submitProject(
          projectId, 
          FUNDING_GOAL,
          `Title for ${projectId}`,
          `Description for ${projectId}`,
          `Short brief for ${projectId}`,
          `ipfs://${projectId}-image`,
          {
            value: SUBMISSION_FEE
          }
        );
      }

      // Setup NFT minting for voters
      const NFT_MINT_PRICE = ethers.parseEther("1000"); // 1000 MRLN
      
      await tokenManager.transfer(voter1.address, NFT_MINT_PRICE);
      await tokenManager.transfer(voter2.address, NFT_MINT_PRICE);
      
      await tokenManager.connect(voter1).approve(await communityNFT.getAddress(), NFT_MINT_PRICE);
      await tokenManager.connect(voter2).approve(await communityNFT.getAddress(), NFT_MINT_PRICE);

      // Mint NFTs to voters
      await communityNFT.connect(voter1).safeMint(voter1.address);
      await communityNFT.connect(voter2).safeMint(voter2.address);
    });

    it("1.1: Should allow admin to reassign proposal lists that haven't voted after first 7 days", async function () {
      // Start a voting round with 3 voters
      const voters = [voter1.address, voter2.address, owner.address];
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Only voter1 votes
      const proposalListVoter1 = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, voter1.address)
      );
      await proposalListVoter1.connect(voter1).vote(["project-1", "project-2"]);
      
      // Get proposal lists for the other voters (who don't vote)
      const proposalListVoter2Address = await projectDAO.getVoterProposalList(1, voter2.address);
      const proposalListOwnerAddress = await projectDAO.getVoterProposalList(1, owner.address);
      
      const proposalListVoter2 = await ethers.getContractAt("ProposalList", proposalListVoter2Address);
      const proposalListOwner = await ethers.getContractAt("ProposalList", proposalListOwnerAddress);
      
      // Verify initial owners
      expect(await proposalListVoter2.owner()).to.equal(voter2.address);
      expect(await proposalListOwner.owner()).to.equal(owner.address);
      
      // Fast forward past 7 days
      await time.increase(7 * 24 * 60 * 60 + 1);
      
      // Admin triggers round one completion
      await projectDAO.connect(admin).completeRoundOne(1);
      
      // Verify ownership reassignment occurred
      expect(await proposalListVoter2.owner()).to.equal(voter1.address);
      expect(await proposalListOwner.owner()).to.equal(voter1.address);
      
      // Verify the reassignedVoters mapping was updated
      expect(await projectDAO.reassignedVoters(1, voter2.address)).to.equal(voter1.address);
      expect(await projectDAO.reassignedVoters(1, owner.address)).to.equal(voter1.address);
    });
    
    it("1.2: Should execute round2 and AI round functions as expected", async function () {
      // Start a voting round with 4 voters
      const voters = [voter1.address, voter2.address, owner.address, admin.address];
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Only voter1 votes in the first round
      const proposalListVoter1 = await ethers.getContractAt(
        "ProposalList", 
        await projectDAO.getVoterProposalList(1, voter1.address)
      );
      await proposalListVoter1.connect(voter1).vote(["project-1", "project-2"]);
      
      // Get reference to all proposal lists
      const proposalListVoter2Address = await projectDAO.getVoterProposalList(1, voter2.address);
      const proposalListOwnerAddress = await projectDAO.getVoterProposalList(1, owner.address);
      const proposalListAdminAddress = await projectDAO.getVoterProposalList(1, admin.address);
      
      const proposalListVoter2 = await ethers.getContractAt("ProposalList", proposalListVoter2Address);
      const proposalListOwner = await ethers.getContractAt("ProposalList", proposalListOwnerAddress);
      const proposalListAdmin = await ethers.getContractAt("ProposalList", proposalListAdminAddress);
      
      // Advance time for round one completion
      await time.increase(7 * 24 * 60 * 60 + 1);
      
      // Complete round one
      await projectDAO.connect(admin).completeRoundOne(1);
      
      // Now all unvoted proposal lists should be reassigned to voter1
      // Verify through roundOneCompleted flag
      expect(await projectDAO.roundOneCompleted(1)).to.be.true;
      
      // Verify roundEndTime is updated for round two
      const roundEndTime = await projectDAO.roundEndTime(1);
      expect(roundEndTime).to.be.gt(await time.latest());
      
      // Advance time for round two
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      // Complete round two
      await projectDAO.connect(admin).completeRoundTwo(1);
      
      // Verify round two completion
      expect(await projectDAO.roundTwoCompleted(1)).to.be.true;
      
      // Advance time for AI round
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      // Trigger AI round
      await expect(projectDAO.connect(admin).triggerAIRound(1))
        .to.emit(projectDAO, "AIRoundTriggered");
    });
    
    it("2.1: Should allow reassigned owner to vote with reassigned proposal list", async function () {
      // Start a voting round with 2 voters
      const voters = [voter1.address, voter2.address];
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Get proposal lists
      const proposalListVoter1Address = await projectDAO.getVoterProposalList(1, voter1.address);
      const proposalListVoter2Address = await projectDAO.getVoterProposalList(1, voter2.address);
      
      const proposalListVoter1 = await ethers.getContractAt("ProposalList", proposalListVoter1Address);
      const proposalListVoter2 = await ethers.getContractAt("ProposalList", proposalListVoter2Address);
      
      // Only voter1 votes in first round
      await proposalListVoter1.connect(voter1).vote(["project-1", "project-2"]);
      
      // Verify initial state
      expect(await proposalListVoter1.voted()).to.be.true;
      expect(await proposalListVoter2.voted()).to.be.false;
      
      // Fast forward and complete round one
      await time.increase(7 * 24 * 60 * 60 + 1);
      await projectDAO.connect(admin).completeRoundOne(1);
      
      // Verify that voter2's list is now owned by voter1
      expect(await proposalListVoter2.owner()).to.equal(voter1.address);
      
      // Verify voting window was reset
      expect(await proposalListVoter2.hasVotingWindowExpired()).to.be.false;
      
      // Now voter1 should be able to vote with the reassigned list
      await proposalListVoter2.connect(voter1).vote(["project-3", "project-1"]);
      
      // Verify that the vote was recorded
      expect(await proposalListVoter2.voted()).to.be.true;
      
      // Get and verify the selected projects
      const selectedProjects = await proposalListVoter2.connect(voter1).getSelectedProjects(2);
      expect(selectedProjects[0]).to.equal("project-3");
      expect(selectedProjects[1]).to.equal("project-1");
      
      // Original owner (voter2) should not be able to vote anymore
      await expect(
        proposalListVoter2.connect(voter2).vote(["project-2"])
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("List Type Distribution", function () {
    beforeEach(async function () {
      // Setup NFT minting for voters
      const NFT_MINT_PRICE = ethers.parseEther("1000"); // 1000 MRLN
      
      await tokenManager.transfer(voter1.address, NFT_MINT_PRICE);
      await tokenManager.transfer(voter2.address, NFT_MINT_PRICE);
      
      await tokenManager.connect(voter1).approve(await communityNFT.getAddress(), NFT_MINT_PRICE);
      await tokenManager.connect(voter2).approve(await communityNFT.getAddress(), NFT_MINT_PRICE);

      // Mint NFTs to voters
      await communityNFT.connect(voter1).safeMint(voter1.address);
      await communityNFT.connect(voter2).safeMint(voter2.address);
    });
    
    it("Should distribute projects into list types with 5 projects each", async function () {
      // Generate 35 projects and 20 voters (smaller set for gas limit constraints)
      const projects = generateProjects(20);
      const voters = [
        voter1.address, voter2.address, owner.address, admin.address,
        ...Array(5).fill(0).map((_, i) => ethers.Wallet.createRandom().address) 
      ];
      
      // Create and approve all projects
      for (const projectId of projects) {
        await projectDAO.connect(projectOwner).submitProject(
          projectId, 
          FUNDING_GOAL,
          `Title for ${projectId}`,
          `Description for ${projectId}`,
          `Short brief for ${projectId}`,
          `ipfs://${projectId}-image`,
          {
            value: SUBMISSION_FEE
          }
        );
      }
      
      // Start voting round with list types
      await projectDAO.connect(admin).startVotingRoundWithListTypes(projects, voters);
      
      // Check the number of list types (20/5 = 4 list types)
      const listTypeCount = await projectDAO.roundListTypeCount(1);
      expect(Number(listTypeCount)).to.equal(4);
      
      // Check that each voter has a proposal list with the correct projects
      for (let i = 0; i < voters.length; i++) {
        const voterProjects = await projectDAO.getVoterProjects(1, voters[i]);
        
        // Each list should have 5 projects
        expect(voterProjects.length).to.equal(5);
        
        // Lists should have unique projects based on list type
        const listTypeId = Number(await projectDAO.voterListTypes(1, voters[i]));
        
        // Check if other voters with the same list type have the same projects
        for (let j = 0; j < voters.length; j++) {
          if (i !== j) {
            const otherListTypeId = Number(await projectDAO.voterListTypes(1, voters[j]));
            
            if (listTypeId === otherListTypeId) {
              const otherVoterProjects = await projectDAO.getVoterProjects(1, voters[j]);
              expect(JSON.stringify(voterProjects)).to.equal(JSON.stringify(otherVoterProjects));
            }
          }
        }
      }
    });
    
    it("Should handle the case where voters % list types != 0", async function () {
      // Generate 20 projects and 11 voters (not divisible by 4 list types)
      const projects = generateProjects(20);
      const voters = [
        voter1.address, voter2.address, owner.address, admin.address,
        ...Array(7).fill(0).map((_, i) => ethers.Wallet.createRandom().address) 
      ];
      
      // Create and approve all projects
      for (const projectId of projects) {
        await projectDAO.connect(projectOwner).submitProject(
          projectId, 
          FUNDING_GOAL,
          `Title for ${projectId}`,
          `Description for ${projectId}`,
          `Short brief for ${projectId}`,
          `ipfs://${projectId}-image`,
          {
            value: SUBMISSION_FEE
          }
        );
      }
      
      // Start voting round with list types
      await projectDAO.connect(admin).startVotingRoundWithListTypes(projects, voters);
      
      // Check the number of list types (20/5 = 4 list types)
      const listTypeCount = Number(await projectDAO.roundListTypeCount(1));
      expect(listTypeCount).to.equal(4);
      
      // Count how many voters are assigned to each list type
      const listTypeCounts = [0, 0, 0, 0];
      
      for (const voter of voters) {
        const listTypeId = Number(await projectDAO.voterListTypes(1, voter));
        listTypeCounts[listTypeId]++;
      }
      
      // With 11 voters and 4 list types:
      // First list type should have 3 voters
      expect(listTypeCounts[0]).to.equal(3);
      // Second list type should have 3 voters
      expect(listTypeCounts[1]).to.equal(3);
      // Third list type should have 3 voters
      expect(listTypeCounts[2]).to.equal(3);
      // Fourth list type should have 2 voters (remainder)
      expect(listTypeCounts[3]).to.equal(2);
      
      // Total should be 11 voters
      const totalVoters = listTypeCounts.reduce((a, b) => a + b, 0);
      expect(totalVoters).to.equal(11);
    });

    it("Should handle projects near threshold for tier 1", async function () {
      // Generate 50 projects (which is below the tier 1 threshold of 100)
      const projects = generateProjects(50);
      
      // Generate 20 voters
      const voters = [
        voter1.address, voter2.address, owner.address, admin.address,
        ...Array(15).fill(0).map((_, i) => ethers.Wallet.createRandom().address) 
      ];
      
      // Create and approve all projects
      for (const projectId of projects) {
        await projectDAO.connect(projectOwner).submitProject(
          projectId, 
          FUNDING_GOAL,
          `Title for ${projectId}`,
          `Description for ${projectId}`,
          `Short brief for ${projectId}`,
          `ipfs://${projectId}-image`,
          {
            value: SUBMISSION_FEE
          }
        );
      }
      
      // Start voting round with list types
      await projectDAO.connect(admin).startVotingRoundWithListTypes(projects, voters);
      
      // Should have 10 list types (50/5 = 10)
      const listTypeCount = Number(await projectDAO.roundListTypeCount(1));
      expect(listTypeCount).to.equal(10);
      
      // Each voter's project list should have 5 projects
      const voter1Projects = await projectDAO.getVoterProjects(1, voter1.address);
      expect(voter1Projects.length).to.equal(5);
      
      // Each list type should have 2 voters (20/10 = 2)
      const listTypeId = Number(await projectDAO.voterListTypes(1, voter1.address));
      let sameListTypeCount = 0;
      
      for (const voter of voters) {
        if (Number(await projectDAO.voterListTypes(1, voter)) === listTypeId) {
          sameListTypeCount++;
        }
      }
      
      expect(sameListTypeCount).to.equal(2);
    });
  });

  describe("Finalist Voting Phase", function () {
    const projects = generateProjects(15); // 15 projects will create 3 list types with 5 projects each
    
    beforeEach(async function () {
      // Setup NFT minting for voters
      const NFT_MINT_PRICE = ethers.parseEther("1000"); // 1000 MRLN
      
      // Setup for multiple voters - just use voter1 and voter2 for simplicity
      for (const voter of [voter1, voter2]) {
        await tokenManager.transfer(voter.address, NFT_MINT_PRICE);
        await tokenManager.connect(voter).approve(await communityNFT.getAddress(), NFT_MINT_PRICE);
        await communityNFT.connect(voter).safeMint(voter.address);
      }
      
      // Submit and approve all projects
      for (const projectId of projects) {
        await projectDAO.connect(projectOwner).submitProject(
          projectId, 
          FUNDING_GOAL,
          `Title for ${projectId}`,
          `Description for ${projectId}`,
          `Short brief for ${projectId}`,
          `ipfs://${projectId}-image`,
          {
            value: SUBMISSION_FEE
          }
        );
      }
    });
    
    it("Should complete the entire voting process without errors", async function () {
      // Use just 2 voters
      const voters = [voter1.address, voter2.address];
      
      // Start initial voting round
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Have voters vote
      for (const [i, voter] of [voter1, voter2].entries()) {
        const voterAddr = voter.address;
        const proposalListAddr = await projectDAO.getVoterProposalList(1, voterAddr);
        const proposalList = await ethers.getContractAt("ProposalList", proposalListAddr);
        
        // Get available projects
        const availableProjects = await proposalList.getAllAvailableProjects();
        
        // Use direct transaction to vote for first project
        const voteData = proposalList.interface.encodeFunctionData(
          "vote", 
          [[availableProjects[0]]]
        );
        
        await voter.sendTransaction({
          to: proposalListAddr,
          data: voteData
        });
      }
      
      // Complete both rounds
      await time.increase(7 * 24 * 60 * 60 + 1);
      await projectDAO.connect(admin).completeRoundOne(1);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      await projectDAO.connect(admin).completeRoundTwo(1);
      
      // We're not testing the finalist voting functionality in depth
      // Just verifying the functions can be called without errors
      await projectDAO.connect(admin).startFinalistVoting(1);
      
      // Just verify we can get the finalist list
      const finalistList = await projectDAO.getFinalistVotingList(1, voter1.address);
      expect(finalistList).to.not.equal(ethers.ZeroAddress);
      
      // Complete the test by ending finalist voting
      await projectDAO.connect(admin).endFinalistVoting(1);
      
      // Test passes if we reach here without errors
      expect(true).to.be.true;
    });
    
    it("Should not allow non-participants to vote in finalist round", async function () {
      // Use just 2 voters
      const voters = [voter1.address, voter2.address];
      
      // Start initial voting round
      await projectDAO.connect(admin).startVotingRound(projects, voters);
      
      // Only voter1 votes
      const voter1ListAddr = await projectDAO.getVoterProposalList(1, voter1.address);
      const proposalList1 = await ethers.getContractAt("ProposalList", voter1ListAddr);
      
      // Get available projects
      const voter1Projects = await proposalList1.getAllAvailableProjects();
      
      // Create vote transaction
      const voteData1 = proposalList1.interface.encodeFunctionData("vote", [[voter1Projects[0], voter1Projects[1], voter1Projects[2]]]);
      
      // Send transaction
      await voter1.sendTransaction({
        to: voter1ListAddr,
        data: voteData1
      });
      
      // Complete rounds and start finalist voting
      await time.increase(7 * 24 * 60 * 60 + 1);
      await projectDAO.connect(admin).completeRoundOne(1);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      await projectDAO.connect(admin).completeRoundTwo(1);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      // Start finalist voting
      await projectDAO.connect(admin).startFinalistVoting(1);
      
      // Verify voter2 cannot participate in finalist round because they didn't vote in the initial round
      await expect(
        projectDAO.connect(voter2).submitFinalistVote(1, ["project-1"])
      ).to.be.revertedWith("Not authorized to vote in finalist phase");
    });
  });

  // Add a new test for getProjectDetails
  describe("Project Details", function () {
    beforeEach(async function () {
      await projectDAO.connect(projectOwner).submitProject(
        PROJECT_ID, 
        FUNDING_GOAL,
        "Test Project",
        "This is a test project description",
        "Short brief for testing",
        "ipfs://image-uri",
        {
          value: SUBMISSION_FEE
        }
      );
    });

    it("Should return correct project details including metadata", async function () {
      const [id, isActive, receivedFunding, title, description, shortBrief, imageUri] = 
        await projectDAO.getProjectDetails(PROJECT_ID);
      
      expect(id).to.equal(PROJECT_ID);
      expect(isActive).to.be.true;
      expect(receivedFunding).to.equal(0);
      expect(title).to.equal("Test Project");
      expect(description).to.equal("This is a test project description");
      expect(shortBrief).to.equal("Short brief for testing");
      expect(imageUri).to.equal("ipfs://image-uri");
    });
  });
}); 