import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { TokenManager, ProjectInvestment } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ProjectInvestment", function () {
  let tokenManager: TokenManager;
  let projectInvestment: ProjectInvestment;
  let owner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;
  
  const TARGET_AMOUNT = ethers.parseEther("1000"); // 1000 MRLN
  const INVESTMENT_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

  beforeEach(async function () {
    // Get signers
    [owner, investor1, investor2] = await ethers.getSigners();

    // Deploy TokenManager first
    const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
    tokenManager = await TokenManagerFactory.deploy(
      "Merlin",
      "MRLN",
      ethers.parseEther("800000000"), // Total supply
      ethers.parseEther("100000000"), // Bridge amount
      100n, // 1% transfer fee (100 basis points)
      ethers.parseEther("1")      // Operation fee: 1 MRLN token
    ) as TokenManager;
    await tokenManager.waitForDeployment();

    // Deploy ProjectInvestment
    const ProjectInvestmentFactory = await ethers.getContractFactory("ProjectInvestment");
    projectInvestment = await ProjectInvestmentFactory.deploy(
      await tokenManager.getAddress(),
      TARGET_AMOUNT
    ) as ProjectInvestment;
    await projectInvestment.waitForDeployment();

    // Transfer some tokens to investors for testing
    await tokenManager.transfer(investor1.address, ethers.parseEther("2000"));
    await tokenManager.transfer(investor2.address, ethers.parseEther("2000"));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await projectInvestment.owner()).to.equal(owner.address);
    });

    it("Should set the correct token and target amount", async function () {
      expect(await projectInvestment.mrlnToken()).to.equal(await tokenManager.getAddress());
      expect(await projectInvestment.targetAmount()).to.equal(TARGET_AMOUNT);
    });

    it("Should initialize with correct values", async function () {
      expect(await projectInvestment.totalInvested()).to.equal(0);
      expect(await projectInvestment.isFinalized()).to.equal(false);
      expect(await projectInvestment.isInvestmentPeriodOpen()).to.equal(true);
    });
  });

  describe("Investment", function () {
    const investAmount = ethers.parseEther("500");

    it("Should allow investors to invest", async function () {
      await tokenManager.connect(investor1).approve(projectInvestment.getAddress(), investAmount);
      await projectInvestment.connect(investor1).invest(investAmount);

      expect(await projectInvestment.totalInvested()).to.equal(investAmount);
      expect(await projectInvestment.getInvestorAmount(investor1.address)).to.equal(investAmount);
    });

    it("Should not allow owner to invest", async function () {
      await tokenManager.approve(projectInvestment.getAddress(), investAmount);
      await expect(projectInvestment.invest(investAmount))
        .to.be.revertedWith("Owner cannot invest");
    });

    it("Should not allow investment after period ends", async function () {
      await time.increase(INVESTMENT_DURATION + 1);
      
      await tokenManager.connect(investor1).approve(projectInvestment.getAddress(), investAmount);
      await expect(projectInvestment.connect(investor1).invest(investAmount))
        .to.be.revertedWith("Investment period ended");
    });

    it("Should track multiple investments correctly", async function () {
      await tokenManager.connect(investor1).approve(projectInvestment.getAddress(), investAmount);
      await tokenManager.connect(investor2).approve(projectInvestment.getAddress(), investAmount);

      await projectInvestment.connect(investor1).invest(investAmount);
      await projectInvestment.connect(investor2).invest(investAmount);

      expect(await projectInvestment.totalInvested()).to.equal(investAmount * BigInt(2));
      expect(await projectInvestment.getInvestorAmount(investor1.address)).to.equal(investAmount);
      expect(await projectInvestment.getInvestorAmount(investor2.address)).to.equal(investAmount);
    });
  });

  describe("Withdrawal", function () {
    const investAmount = ethers.parseEther("500");

    beforeEach(async function () {
      await tokenManager.connect(investor1).approve(projectInvestment.getAddress(), investAmount);
      await projectInvestment.connect(investor1).invest(investAmount);
    });

    it("Should not allow withdrawal before investment period ends", async function () {
      await expect(projectInvestment.connect(investor1).withdrawInvestment())
        .to.be.revertedWith("Investment period not ended");
    });

    it("Should allow withdrawal if target not reached", async function () {
      await time.increase(INVESTMENT_DURATION + 1);
      
      const initialBalance = await tokenManager.balanceOf(investor1.address);
      await projectInvestment.connect(investor1).withdrawInvestment();
      const finalBalance = await tokenManager.balanceOf(investor1.address);

      expect(finalBalance - initialBalance).to.equal(investAmount);
      expect(await projectInvestment.totalInvested()).to.equal(0);
      expect(await projectInvestment.getInvestorAmount(investor1.address)).to.equal(0);
    });

    it("Should not allow withdrawal if target reached", async function () {
      // Invest enough to reach target
      await tokenManager.connect(investor2).approve(projectInvestment.getAddress(), TARGET_AMOUNT);
      await projectInvestment.connect(investor2).invest(TARGET_AMOUNT);

      await time.increase(INVESTMENT_DURATION + 1);
      
      await expect(projectInvestment.connect(investor1).withdrawInvestment())
        .to.be.revertedWith("Target reached, cannot withdraw");
    });
  });

  describe("Owner Withdrawal", function () {
    const totalInvestAmount = ethers.parseEther("1200"); // More than target

    beforeEach(async function () {
      await tokenManager.connect(investor1).approve(projectInvestment.getAddress(), totalInvestAmount);
      await projectInvestment.connect(investor1).invest(totalInvestAmount);
    });

    it("Should allow owner to withdraw if target reached", async function () {
      await time.increase(INVESTMENT_DURATION + 1);
      
      const initialBalance = await tokenManager.balanceOf(owner.address);
      await projectInvestment.ownerWithdraw();
      const finalBalance = await tokenManager.balanceOf(owner.address);

      expect(finalBalance - initialBalance).to.equal(totalInvestAmount);
      expect(await projectInvestment.isFinalized()).to.equal(true);
    });

    it("Should not allow owner to withdraw before period ends", async function () {
      await expect(projectInvestment.ownerWithdraw())
        .to.be.revertedWith("Investment period not ended");
    });

    it("Should not allow owner to withdraw if target not reached", async function () {
      // Reset the state for this test
      const ProjectInvestmentFactory = await ethers.getContractFactory("ProjectInvestment");
      projectInvestment = await ProjectInvestmentFactory.deploy(
        await tokenManager.getAddress(),
        TARGET_AMOUNT
      ) as ProjectInvestment;

      // Invest below target
      await tokenManager.connect(investor1).approve(projectInvestment.getAddress(), ethers.parseEther("500"));
      await projectInvestment.connect(investor1).invest(ethers.parseEther("500"));
      
      await time.increase(INVESTMENT_DURATION + 1);
      await expect(projectInvestment.ownerWithdraw())
        .to.be.revertedWith("Target not reached");
    });

    it("Should not allow multiple withdrawals", async function () {
      await time.increase(INVESTMENT_DURATION + 1);
      await projectInvestment.ownerWithdraw();
      
      await expect(projectInvestment.ownerWithdraw())
        .to.be.revertedWith("Investment already finalized");
    });
  });

  describe("View Functions", function () {
    it("Should return correct time remaining", async function () {
      const initialTimeRemaining = await projectInvestment.getTimeRemaining();
      expect(initialTimeRemaining).to.be.gt(0);

      await time.increase(INVESTMENT_DURATION / 2);
      
      const midTimeRemaining = await projectInvestment.getTimeRemaining();
      expect(midTimeRemaining).to.be.lt(initialTimeRemaining);

      await time.increase(INVESTMENT_DURATION);
      
      const finalTimeRemaining = await projectInvestment.getTimeRemaining();
      expect(finalTimeRemaining).to.equal(0);
    });

    it("Should correctly report if target is reached", async function () {
      expect(await projectInvestment.isTargetReached()).to.equal(false);

      await tokenManager.connect(investor1).approve(projectInvestment.getAddress(), TARGET_AMOUNT);
      await projectInvestment.connect(investor1).invest(TARGET_AMOUNT);

      expect(await projectInvestment.isTargetReached()).to.equal(true);
    });

    it("Should correctly report if investment period is open", async function () {
      expect(await projectInvestment.isInvestmentPeriodOpen()).to.equal(true);

      // Invest and finalize before time increase
      await tokenManager.connect(investor1).approve(projectInvestment.getAddress(), TARGET_AMOUNT);
      await projectInvestment.connect(investor1).invest(TARGET_AMOUNT);

      await time.increase(INVESTMENT_DURATION + 1);
      expect(await projectInvestment.isInvestmentPeriodOpen()).to.equal(false);

      // Should remain closed after finalization
      await projectInvestment.ownerWithdraw();
      expect(await projectInvestment.isInvestmentPeriodOpen()).to.equal(false);
    });
  });
}); 