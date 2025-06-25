// @ts-nocheck
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  ProjectDAO,
  CommunityNFT,
  TokenManager,
  ProposalList
} from "../typechain-types";

describe("Project Participation Limit", function () {
  let projectDAO: ProjectDAO;
  let communityNFT: CommunityNFT;
  let tokenManager: any; // Use 'any' type to bypass TypeScript checks until types are regenerated
  let admin: SignerWithAddress;
  let coreTeam: SignerWithAddress;
  let owner: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  
  const ROUND_DURATION = 3 * 24 * 60 * 60; // 3 days in seconds
  const PROJECT_1 = "project1";
  const PROJECT_2 = "project2";
  const PROJECT_3 = "project3";
  const PROJECT_4 = "project4";
  const PROJECT_5 = "project5";
  const SUBMISSION_FEE = ethers.parseEther("0.1");
  
  beforeEach(async function () {
    [owner, admin, coreTeam, voter1, voter2, voter3] = await ethers.getSigners();
    
    // Deploy token manager first with updated constructor
    const TokenManager = await ethers.getContractFactory("TokenManager");
    tokenManager = await TokenManager.deploy(
      "Merlin",
      "MRLN",
      ethers.parseEther("800000000") // Total supply
    );
    await tokenManager.waitForDeployment();
    
    // Deploy community NFT
    const CommunityNFT = await ethers.getContractFactory("CommunityNFT");
    communityNFT = await CommunityNFT.deploy(await tokenManager.getAddress());
    await communityNFT.waitForDeployment();
    
    // Deploy ProjectDAO
    const ProjectDAO = await ethers.getContractFactory("ProjectDAO");
    projectDAO = await ProjectDAO.deploy(
      await communityNFT.getAddress(),
      await tokenManager.getAddress()
    );
    await projectDAO.waitForDeployment();
    
    // Grant admin role to admin
    await projectDAO.grantRole(await projectDAO.ADMIN_ROLE(), admin.address);
    await projectDAO.grantRole(await projectDAO.CORE_TEAM_ROLE(), coreTeam.address);
  });
  
  it("Should track project participation count correctly", async function () {
    // Create a few projects - use 'any' type to bypass TypeScript checks for the updated function
    const projectDAOAny = projectDAO as any;
    
    await projectDAOAny.connect(owner).submitProject(
      "project-1", 
      ethers.parseEther("1000"), 
      "Project 1 Title", 
      "Project 1 Description", 
      "Project 1 Brief", 
      "ipfs://project-1-image", 
      { value: SUBMISSION_FEE }
    );
    await projectDAOAny.connect(owner).submitProject(
      "project-2", 
      ethers.parseEther("2000"), 
      "Project 2 Title", 
      "Project 2 Description", 
      "Project 2 Brief", 
      "ipfs://project-2-image", 
      { value: SUBMISSION_FEE }
    );
    await projectDAOAny.connect(owner).submitProject(
      "project-3", 
      ethers.parseEther("3000"), 
      "Project 3 Title", 
      "Project 3 Description", 
      "Project 3 Brief", 
      "ipfs://project-3-image", 
      { value: SUBMISSION_FEE }
    );

    // Verify initial participation count is 0
    let participationCount = await projectDAO.getProjectParticipationCount("project-1");
    expect(participationCount).to.equal(0);

    // Start first voting round
    await projectDAO.connect(admin).startVotingRound(
      ["project-1", "project-2", "project-3"],
      [voter1.address, voter2.address]
    );
    
    // Verify participation count is incremented to 1
    participationCount = await projectDAO.getProjectParticipationCount("project-1");
    expect(participationCount).to.equal(1);

    // Start second voting round
    await projectDAO.connect(admin).startVotingRound(
      ["project-1", "project-2"],
      [voter1.address, voter2.address]
    );
    
    // Verify participation count is incremented to 2
    participationCount = await projectDAO.getProjectParticipationCount("project-1");
    expect(participationCount).to.equal(2);

    // Start third voting round
    await projectDAO.connect(admin).startVotingRound(
      ["project-1", "project-3"],
      [voter1.address, voter2.address]
    );
    
    // Verify participation count is incremented to 3
    participationCount = await projectDAO.getProjectParticipationCount("project-1");
    expect(participationCount).to.equal(3);

    // Attempt to start a fourth round with project-1 (should fail)
    await expect(
      projectDAO.connect(admin).startVotingRound(
        ["project-1", "project-2"],
        [voter1.address, voter2.address]
      )
    ).to.be.revertedWith("Project already participated in 3 voting rounds");
    
    // Verify project-2 can still be included in a voting round
    await projectDAO.connect(admin).startVotingRound(
      ["project-2"],
      [voter1.address, voter2.address]
    );
    
    // Verify participation count for project-2 is now 3
    participationCount = await projectDAO.getProjectParticipationCount("project-2");
    expect(participationCount).to.equal(3);
  });
  
  it("Should enforce participation limit in list type voting rounds", async function () {
    // Create projects
    const projectDAOAny = projectDAO as any;
    
    for (let i = 1; i <= 15; i++) {
      await projectDAOAny.connect(owner).submitProject(
        `project-${i}`, 
        ethers.parseEther("1000"), 
        `Project ${i} Title`, 
        `Project ${i} Description`, 
        `Project ${i} Brief`, 
        `ipfs://project-${i}-image`, 
        { value: SUBMISSION_FEE }
      );
    }

    const projectsSet1 = Array.from({length: 8}, (_, i) => `project-${i+1}`);
    const projectsSet2 = Array.from({length: 8}, (_, i) => `project-${i+1}`);
    const projectsSet3 = Array.from({length: 8}, (_, i) => `project-${i+1}`);
    
    const voters = [voter1.address, voter2.address, voter3.address];

    // Start first round with list types
    await projectDAO.connect(admin).startVotingRoundWithListTypes(
      projectsSet1,
      voters
    );
    
    // Start second round with list types
    await projectDAO.connect(admin).startVotingRoundWithListTypes(
      projectsSet2,
      voters
    );
    
    // Start third round with list types
    await projectDAO.connect(admin).startVotingRoundWithListTypes(
      projectsSet3,
      voters
    );
    
    // Attempt to start a fourth round with project-1 (should fail)
    const projectsSet4 = ["project-1", "project-9", "project-10"];
    await expect(
      projectDAO.connect(admin).startVotingRoundWithListTypes(
        projectsSet4,
        voters
      )
    ).to.be.revertedWith("Project already participated in 3 voting rounds");
    
    // Should be able to start a round with only new projects
    const projectsSet5 = ["project-9", "project-10", "project-11"];
    await projectDAO.connect(admin).startVotingRoundWithListTypes(
      projectsSet5,
      voters
    );
  });
}); 