import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ProposalList } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ProposalList", function () {
  let proposalList: ProposalList;
  let owner: SignerWithAddress;
  let voter: SignerWithAddress;
  let otherAccount: SignerWithAddress;
  
  const VOTING_ROUND = 1;
  const INITIAL_PROJECTS = ["project-1", "project-2", "project-3", "project-4", "project-5"];
  const VOTING_WINDOW = 7 * 24 * 60 * 60; // 7 days in seconds

  beforeEach(async function () {
    [owner, voter, otherAccount] = await ethers.getSigners();

    const ProposalListFactory = await ethers.getContractFactory("ProposalList");
    proposalList = await ProposalListFactory.deploy(
      owner.address, // mock DAO address
      VOTING_ROUND,
      INITIAL_PROJECTS,
      voter.address
    );
    await proposalList.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct initial values", async function () {
      expect(await proposalList.dao()).to.equal(owner.address);
      expect(await proposalList.votingRound()).to.equal(VOTING_ROUND);
      expect(await proposalList.owner()).to.equal(voter.address);
      expect(await proposalList.voted()).to.be.false;
      expect(await proposalList.availableProjectCount()).to.equal(INITIAL_PROJECTS.length);
    });

    it("Should store all initial projects correctly", async function () {
      const storedProjects = await proposalList.getAllAvailableProjects();
      expect(storedProjects).to.deep.equal(INITIAL_PROJECTS);
    });
  });

  describe("Voting", function () {
    it("Should allow owner to vote", async function () {
      const selectedProjects = ["project-1", "project-2"];
      
      await expect(proposalList.connect(voter).vote(selectedProjects))
        .to.not.be.reverted;
      
      expect(await proposalList.voted()).to.be.true;
      
      const votedProjects = await proposalList.getSelectedProjects(selectedProjects.length);
      expect(votedProjects).to.deep.equal(selectedProjects);
    });

    it("Should reject voting from non-owner", async function () {
      await expect(proposalList.connect(otherAccount).vote(["project-1"]))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject empty vote list", async function () {
      await expect(proposalList.connect(voter).vote([]))
        .to.be.revertedWith("No projects selected");
    });

    it("Should reject multiple votes from same voter", async function () {
      await proposalList.connect(voter).vote(["project-1"]);
      
      await expect(proposalList.connect(voter).vote(["project-2"]))
        .to.be.revertedWith("Already voted");
    });

    it("Should reject votes after voting window expires", async function () {
      await time.increase(VOTING_WINDOW + 1);
      
      await expect(proposalList.connect(voter).vote(["project-1"]))
        .to.be.revertedWith("Voting window expired");
    });
  });

  describe("Project Retrieval", function () {
    beforeEach(async function () {
      await proposalList.connect(voter).vote(["project-1", "project-2", "project-3"]);
    });

    it("Should return correct number of selected projects", async function () {
      const twoProjects = await proposalList.getSelectedProjects(2);
      expect(twoProjects).to.deep.equal(["project-1", "project-2"]);

      const allProjects = await proposalList.getSelectedProjects(5);
      expect(allProjects).to.deep.equal(["project-1", "project-2", "project-3"]);
    });

    it("Should return all available projects", async function () {
      const projects = await proposalList.getAllAvailableProjects();
      expect(projects).to.deep.equal(INITIAL_PROJECTS);
    });

    it("Should reject getting selected projects before voting", async function () {
      const newProposalList = await (await ethers.getContractFactory("ProposalList")).deploy(
        owner.address,
        VOTING_ROUND,
        INITIAL_PROJECTS,
        voter.address
      );

      await expect(newProposalList.getSelectedProjects(1))
        .to.be.revertedWith("Not voted yet");
    });
  });

  describe("Voting Window", function () {
    it("Should correctly report voting window status", async function () {
      expect(await proposalList.hasVotingWindowExpired()).to.be.false;
      
      await time.increase(VOTING_WINDOW - 10);
      expect(await proposalList.hasVotingWindowExpired()).to.be.false;
      
      await time.increase(11);
      expect(await proposalList.hasVotingWindowExpired()).to.be.true;
    });
  });
}); 