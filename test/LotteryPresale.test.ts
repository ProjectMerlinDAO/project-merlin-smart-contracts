import { expect } from "chai";
import { ethers } from "hardhat";
import { LotteryPresale, MockERC20 } from "../typechain-types";

describe("LotteryPresale", function () {
  let lotteryPresale: LotteryPresale;
  let regularPresale: LotteryPresale;
  let owner: any;
  let userA: any;
  let userB: any;
  let userC: any;
  let mockToken: MockERC20;
  let mockUSDC: MockERC20;

  const TOKEN_PRICE = ethers.parseUnits("0.1", 6); // 0.1 USDC per token
  const MAX_CONTRIBUTION = ethers.parseUnits("200", 6); // 200 USDC max per user for lottery
  const MAX_BUY_LIMIT = ethers.parseUnits("10000", 18); // 10,000 tokens max for regular
  const DURATION = 3 * 24 * 60 * 60; // 3 days
  const PRESALE_TOKEN_AMOUNT = ethers.parseUnits("100000", 18); // 100K tokens
  const USER_USDC_BALANCE = ethers.parseUnits("1000", 6); // 1K USDC per user

  beforeEach(async function () {
    [owner, userA, userB, userC] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    
    mockToken = await MockERC20Factory.deploy("Test Token", "TT", 18);
    await mockToken.waitForDeployment();
    
    mockUSDC = await MockERC20Factory.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Deploy LotteryPresale contracts
    const LotteryPresaleFactory = await ethers.getContractFactory("LotteryPresale");
    
    // Deploy lottery presale
    lotteryPresale = await LotteryPresaleFactory.deploy(
      await mockToken.getAddress(),
      await mockUSDC.getAddress(),
      TOKEN_PRICE,
      MAX_CONTRIBUTION,
      1, // LOTTERY
      DURATION
    );
    await lotteryPresale.waitForDeployment();

    // Deploy regular presale for comparison
    regularPresale = await LotteryPresaleFactory.deploy(
      await mockToken.getAddress(),
      await mockUSDC.getAddress(),
      TOKEN_PRICE,
      MAX_BUY_LIMIT,
      0, // REGULAR
      DURATION
    );
    await regularPresale.waitForDeployment();

    // Mint tokens and USDC
    await mockToken.mint(owner.address, ethers.parseUnits("1000000", 18));
    await mockUSDC.mint(userA.address, USER_USDC_BALANCE);
    await mockUSDC.mint(userB.address, USER_USDC_BALANCE);
    await mockUSDC.mint(userC.address, USER_USDC_BALANCE);

    // Fund presale contracts
    await mockToken.approve(await lotteryPresale.getAddress(), PRESALE_TOKEN_AMOUNT);
    await lotteryPresale.addTokensToPresale(PRESALE_TOKEN_AMOUNT);
    
    await mockToken.approve(await regularPresale.getAddress(), PRESALE_TOKEN_AMOUNT);
    await regularPresale.addTokensToPresale(PRESALE_TOKEN_AMOUNT);
  });

  describe("Deployment and Basic Info", function () {
    it("Should deploy lottery presale with correct parameters", async function () {
      const info = await lotteryPresale.presaleInfo();
      
      expect(info.token).to.equal(await mockToken.getAddress());
      expect(info.paymentToken).to.equal(await mockUSDC.getAddress());
      expect(info.tokenPrice).to.equal(TOKEN_PRICE);
      expect(info.maxBuyLimit).to.equal(MAX_CONTRIBUTION);
      expect(info.presaleType).to.equal(1); // LOTTERY
      expect(info.status).to.equal(0); // ACTIVE
      expect(info.duration).to.equal(DURATION);
      expect(info.totalParticipants).to.equal(0);
      expect(info.selectedWinners).to.equal(0);
    });

    it("Should deploy regular presale with correct parameters", async function () {
      const info = await regularPresale.presaleInfo();
      
      expect(info.presaleType).to.equal(0); // REGULAR
      expect(info.maxBuyLimit).to.equal(MAX_BUY_LIMIT);
    });
  });

  describe("Lottery Participation", function () {
    it("Should allow users to participate in lottery", async function () {
      const usdcAmount = ethers.parseUnits("100", 6);
      
      await mockUSDC.connect(userA).approve(await lotteryPresale.getAddress(), usdcAmount);
      
      await expect(lotteryPresale.connect(userA).participateInLottery(usdcAmount))
        .to.emit(lotteryPresale, "LotteryParticipant")
        .withArgs(userA.address, usdcAmount);

      const participation = await lotteryPresale.getLotteryParticipation(userA.address);
      expect(participation.usdcContributed).to.equal(usdcAmount);
      expect(participation.isSelected).to.equal(false);
      expect(participation.hasClaimedRefund).to.equal(false);

      const info = await lotteryPresale.presaleInfo();
      expect(info.totalParticipants).to.equal(1);
      expect(info.totalUsdcRaised).to.equal(usdcAmount);
    });

    it("Should not allow regular token purchase in lottery mode", async function () {
      const usdcAmount = ethers.parseUnits("100", 6);
      
      await mockUSDC.connect(userA).approve(await lotteryPresale.getAddress(), usdcAmount);
      
      await expect(lotteryPresale.connect(userA).buyTokens(usdcAmount))
        .to.be.revertedWith("Use participateInLottery for lottery presale");
    });

    it("Should not allow lottery participation in regular mode", async function () {
      const usdcAmount = ethers.parseUnits("100", 6);
      
      await mockUSDC.connect(userA).approve(await regularPresale.getAddress(), usdcAmount);
      
      await expect(regularPresale.connect(userA).participateInLottery(usdcAmount))
        .to.be.revertedWith("Use buyTokens for regular presale");
    });
  });

  describe("Your Example Scenario", function () {
    it("Should handle the 3-user lottery scenario correctly", async function () {
      // Step 1: Users participate in lottery
      const userAAmount = ethers.parseUnits("100", 6); // 100 USDC
      const userBAmount = ethers.parseUnits("50", 6);  // 50 USDC  
      const userCAmount = ethers.parseUnits("50", 6);  // 50 USDC
      
      // User A participates
      await mockUSDC.connect(userA).approve(await lotteryPresale.getAddress(), userAAmount);
      await lotteryPresale.connect(userA).participateInLottery(userAAmount);
      
      // User B participates
      await mockUSDC.connect(userB).approve(await lotteryPresale.getAddress(), userBAmount);
      await lotteryPresale.connect(userB).participateInLottery(userBAmount);
      
      // User C participates
      await mockUSDC.connect(userC).approve(await lotteryPresale.getAddress(), userCAmount);
      await lotteryPresale.connect(userC).participateInLottery(userCAmount);

      // Verify participation
      const info = await lotteryPresale.presaleInfo();
      expect(info.totalParticipants).to.equal(3);
      expect(info.totalUsdcRaised).to.equal(userAAmount + userBAmount + userCAmount); // 200 USDC

      // Step 2: Fast forward time to end presale
      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine", []);

      // Step 3: Admin selects winners (User A and User B)
      const tx = await lotteryPresale.selectWinners([userA.address, userB.address]);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      
      await expect(tx)
        .to.emit(lotteryPresale, "WinnersSelected")
        .withArgs([userA.address, userB.address], 2, block!.timestamp);

      // Verify winner selection
      const winners = await lotteryPresale.getWinners();
      expect(winners).to.deep.equal([userA.address, userB.address]);
      expect(await lotteryPresale.isWinner(userA.address)).to.equal(true);
      expect(await lotteryPresale.isWinner(userB.address)).to.equal(true);
      expect(await lotteryPresale.isWinner(userC.address)).to.equal(false);

      // Step 4: Admin distributes tokens to winners
      await lotteryPresale.distributeTokensToWinners();

      // Calculate expected tokens: 200 USDC / 0.1 USDC per token = 2000 tokens
      // 2000 tokens / 2 winners = 1000 tokens each
      const expectedTokensPerWinner = ethers.parseUnits("1000", 18);

      // Verify token distribution
      const userAPurchase = await lotteryPresale.getUserPurchase(userA.address);
      const userBPurchase = await lotteryPresale.getUserPurchase(userB.address);
      const userCPurchase = await lotteryPresale.getUserPurchase(userC.address);

      expect(userAPurchase.totalTokensBought).to.equal(expectedTokensPerWinner);
      expect(userAPurchase.isWinner).to.equal(true);
      expect(userBPurchase.totalTokensBought).to.equal(expectedTokensPerWinner);
      expect(userBPurchase.isWinner).to.equal(true);
      expect(userCPurchase.totalTokensBought).to.equal(0);
      expect(userCPurchase.isWinner).to.equal(false);

      // Step 5: Test token claiming (with unlock progression)
      await lotteryPresale.setUnlockPercentage(2500); // 25%
      
      const expectedClaimable = expectedTokensPerWinner * 25n / 100n; // 250 tokens
      
      expect(await lotteryPresale.getClaimableAmount(userA.address)).to.equal(expectedClaimable);
      expect(await lotteryPresale.getClaimableAmount(userB.address)).to.equal(expectedClaimable);
      expect(await lotteryPresale.getClaimableAmount(userC.address)).to.equal(0);

      // Winners claim tokens
      await lotteryPresale.connect(userA).claimTokens();
      await lotteryPresale.connect(userB).claimTokens();

      expect(await mockToken.balanceOf(userA.address)).to.equal(expectedClaimable);
      expect(await mockToken.balanceOf(userB.address)).to.equal(expectedClaimable);
      expect(await mockToken.balanceOf(userC.address)).to.equal(0);

      // Step 6: Test refund for loser
      expect(await lotteryPresale.getRefundableAmount(userC.address)).to.equal(userCAmount);
      
      await lotteryPresale.connect(userC).claimRefund();
      
      expect(await mockUSDC.balanceOf(userC.address)).to.equal(USER_USDC_BALANCE); // Got refund back
      expect(await lotteryPresale.getRefundableAmount(userC.address)).to.equal(0);

      // Verify comprehensive user status
      const userAStatus = await lotteryPresale.getUserTokenStatus(userA.address);
      const userCStatus = await lotteryPresale.getUserTokenStatus(userC.address);

      expect(userAStatus.totalTokensBought).to.equal(expectedTokensPerWinner);
      expect(userAStatus.totalClaimedTokens).to.equal(expectedClaimable);
      expect(userAStatus.isWinner).to.equal(true);
      expect(userAStatus.refundableAmount).to.equal(0);

      expect(userCStatus.totalTokensBought).to.equal(0);
      expect(userCStatus.totalClaimedTokens).to.equal(0);
      expect(userCStatus.isWinner).to.equal(false);
      expect(userCStatus.refundableAmount).to.equal(0); // Already claimed refund
    });
  });

  describe("Time-based Controls", function () {
    it("Should track remaining time correctly", async function () {
      const remainingTime = await lotteryPresale.getRemainingTime();
      expect(remainingTime).to.be.closeTo(BigInt(DURATION), BigInt(10)); // Within 10 seconds
      
      expect(await lotteryPresale.isPresaleActive()).to.equal(true);
      expect(await lotteryPresale.isPresaleEnded()).to.equal(false);
    });

    it("Should end presale after duration", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await lotteryPresale.getRemainingTime()).to.equal(0);
      expect(await lotteryPresale.isPresaleActive()).to.equal(false);
      expect(await lotteryPresale.isPresaleEnded()).to.equal(true);
    });

    it("Should not allow participation after presale ends", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine", []);

      const usdcAmount = ethers.parseUnits("100", 6);
      await mockUSDC.connect(userA).approve(await lotteryPresale.getAddress(), usdcAmount);
      
      await expect(lotteryPresale.connect(userA).participateInLottery(usdcAmount))
        .to.be.revertedWith("Presale has ended");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to end presale early", async function () {
      expect(await lotteryPresale.isPresaleActive()).to.equal(true);
      
      await lotteryPresale.endPresale();
      
      expect(await lotteryPresale.isPresaleEnded()).to.equal(true);
      expect(await lotteryPresale.canSelectWinners()).to.equal(true);
    });

    it("Should validate winner selection", async function () {
      // Add some participants first
      const usdcAmount = ethers.parseUnits("100", 6);
      await mockUSDC.connect(userA).approve(await lotteryPresale.getAddress(), usdcAmount);
      await lotteryPresale.connect(userA).participateInLottery(usdcAmount);

      // End presale
      await lotteryPresale.endPresale();

      // Should not allow selecting non-participants
      await expect(lotteryPresale.selectWinners([userB.address]))
        .to.be.revertedWith("Winner must be a participant");

      // Should allow selecting valid participants
      await expect(lotteryPresale.selectWinners([userA.address]))
        .to.emit(lotteryPresale, "WinnersSelected");
    });
  });
}); 