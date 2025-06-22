import { expect } from "chai";
import { ethers } from "hardhat";
import { TokenPresale, MockERC20 } from "../typechain-types";

describe("TokenPresale", function () {
  let tokenPresale: TokenPresale;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;
  let mockToken: MockERC20;
  let mockUSDC: MockERC20;
  let mockUSDT: MockERC20;

  const TOKEN_PRICE = ethers.parseUnits("0.04", 6); // 0.04 USDC/USDT per token
  const MIN_BUY_LIMIT = ethers.parseUnits("100", 6); // 100 USDC/USDT minimum
  const MAX_BUY_LIMIT = ethers.parseUnits("500", 6); // 500 USDC/USDT maximum per user
  const TOTAL_TOKENS_FOR_SALE = ethers.parseUnits("1000000", 18); // 1M tokens for sale
  const INITIAL_TOKEN_SUPPLY = ethers.parseUnits("10000000", 18); // 10M tokens total supply
  const PRESALE_TOKEN_AMOUNT = ethers.parseUnits("1000000", 18); // 1M tokens for presale
  const USER_USDC_BALANCE = ethers.parseUnits("1000", 6); // 1K USDC per user
  const USER_USDT_BALANCE = ethers.parseUnits("1000", 6); // 1K USDT per user

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    
    // Deploy mock MRL token (18 decimals)
    mockToken = await MockERC20Factory.deploy("Merlin Token", "MRL", 18);
    await mockToken.waitForDeployment();
    
    // Deploy mock USDC (6 decimals)
    mockUSDC = await MockERC20Factory.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Deploy mock USDT (6 decimals)
    mockUSDT = await MockERC20Factory.deploy("Tether USD", "USDT", 6);
    await mockUSDT.waitForDeployment();

    // Mint initial tokens
    await mockToken.mint(owner.address, INITIAL_TOKEN_SUPPLY);
    await mockUSDC.mint(owner.address, ethers.parseUnits("1000000", 6));
    await mockUSDT.mint(owner.address, ethers.parseUnits("1000000", 6));

    // Deploy TokenPresale contract with new constructor parameters
    const TokenPresaleFactory = await ethers.getContractFactory("TokenPresale");
    tokenPresale = await TokenPresaleFactory.deploy(
      await mockToken.getAddress(),    // _token
      await mockUSDC.getAddress(),     // _usdc  
      await mockUSDT.getAddress(),     // _usdt
      TOKEN_PRICE,                     // _tokenPrice
      MIN_BUY_LIMIT,                   // _minBuyLimit
      MAX_BUY_LIMIT,                   // _maxBuyLimit
      TOTAL_TOKENS_FOR_SALE           // _totalTokensForSale
    );
    await tokenPresale.waitForDeployment();

    // Distribute payment tokens to users
    await mockUSDC.transfer(user1.address, USER_USDC_BALANCE);
    await mockUSDC.transfer(user2.address, USER_USDC_BALANCE);
    await mockUSDC.transfer(user3.address, USER_USDC_BALANCE);
    
    await mockUSDT.transfer(user1.address, USER_USDT_BALANCE);
    await mockUSDT.transfer(user2.address, USER_USDT_BALANCE);
    await mockUSDT.transfer(user3.address, USER_USDT_BALANCE);

    // Fund presale contract with tokens
    await mockToken.approve(await tokenPresale.getAddress(), PRESALE_TOKEN_AMOUNT);
    await tokenPresale.addTokensToPresale(PRESALE_TOKEN_AMOUNT);
  });

  describe("Deployment", function () {
    it("Should set the correct initial parameters", async function () {
      const presaleInfo = await tokenPresale.presaleInfo();
      expect(presaleInfo.token).to.equal(await mockToken.getAddress());
      expect(presaleInfo.paymentToken).to.equal(await mockUSDC.getAddress()); // Backward compatibility
      expect(presaleInfo.tokenPrice).to.equal(TOKEN_PRICE);
      expect(presaleInfo.minBuyLimit).to.equal(MIN_BUY_LIMIT);
      expect(presaleInfo.maxBuyLimit).to.equal(MAX_BUY_LIMIT);
      expect(presaleInfo.totalTokensForSale).to.equal(TOTAL_TOKENS_FOR_SALE);
      expect(presaleInfo.isActive).to.equal(false);
      expect(presaleInfo.currentUnlockPercentage).to.equal(0);
      expect(presaleInfo.totalTokensSold).to.equal(0);
      expect(presaleInfo.totalPaymentRaised).to.equal(0);
    });

    it("Should set the correct extended presale info", async function () {
      const extendedInfo = await tokenPresale.getExtendedPresaleInfo();
      expect(extendedInfo.token).to.equal(await mockToken.getAddress());
      expect(extendedInfo.usdc).to.equal(await mockUSDC.getAddress());
      expect(extendedInfo.usdt).to.equal(await mockUSDT.getAddress());
      expect(extendedInfo.tokenPrice).to.equal(TOKEN_PRICE);
      expect(extendedInfo.minBuyLimit).to.equal(MIN_BUY_LIMIT);
      expect(extendedInfo.maxBuyLimit).to.equal(MAX_BUY_LIMIT);
      expect(extendedInfo.totalTokensForSale).to.equal(TOTAL_TOKENS_FOR_SALE);
      expect(extendedInfo.soldPercentage).to.equal(0);
    });

    it("Should set the correct owner", async function () {
      expect(await tokenPresale.owner()).to.equal(owner.address);
    });

    it("Should have correct contract token balance", async function () {
      expect(await tokenPresale.getContractTokenBalance()).to.equal(PRESALE_TOKEN_AMOUNT);
    });

    it("Should accept correct payment tokens", async function () {
      expect(await tokenPresale.isPaymentTokenAccepted(await mockUSDC.getAddress())).to.equal(true);
      expect(await tokenPresale.isPaymentTokenAccepted(await mockUSDT.getAddress())).to.equal(true);
    });

    it("Should revert with invalid constructor parameters", async function () {
      const TokenPresaleFactory = await ethers.getContractFactory("TokenPresale");
      
      await expect(TokenPresaleFactory.deploy(
        ethers.ZeroAddress,
        await mockUSDC.getAddress(),
        await mockUSDT.getAddress(),
        TOKEN_PRICE,
        MIN_BUY_LIMIT,
        MAX_BUY_LIMIT,
        TOTAL_TOKENS_FOR_SALE
      )).to.be.revertedWith("Token address cannot be zero");

      await expect(TokenPresaleFactory.deploy(
        await mockToken.getAddress(),
        ethers.ZeroAddress,
        await mockUSDT.getAddress(),
        TOKEN_PRICE,
        MIN_BUY_LIMIT,
        MAX_BUY_LIMIT,
        TOTAL_TOKENS_FOR_SALE
      )).to.be.revertedWith("USDC address cannot be zero");

      await expect(TokenPresaleFactory.deploy(
        await mockToken.getAddress(),
        await mockUSDC.getAddress(),
        ethers.ZeroAddress,
        TOKEN_PRICE,
        MIN_BUY_LIMIT,
        MAX_BUY_LIMIT,
        TOTAL_TOKENS_FOR_SALE
      )).to.be.revertedWith("USDT address cannot be zero");

      await expect(TokenPresaleFactory.deploy(
        await mockToken.getAddress(),
        await mockUSDC.getAddress(),
        await mockUSDT.getAddress(),
        0,
        MIN_BUY_LIMIT,
        MAX_BUY_LIMIT,
        TOTAL_TOKENS_FOR_SALE
      )).to.be.revertedWith("Token price must be greater than zero");

      await expect(TokenPresaleFactory.deploy(
        await mockToken.getAddress(),
        await mockUSDC.getAddress(),
        await mockUSDT.getAddress(),
        TOKEN_PRICE,
        0,
        MAX_BUY_LIMIT,
        TOTAL_TOKENS_FOR_SALE
      )).to.be.revertedWith("Min buy limit must be greater than zero");

      await expect(TokenPresaleFactory.deploy(
        await mockToken.getAddress(),
        await mockUSDC.getAddress(),
        await mockUSDT.getAddress(),
        TOKEN_PRICE,
        MIN_BUY_LIMIT,
        0,
        TOTAL_TOKENS_FOR_SALE
      )).to.be.revertedWith("Max buy limit must be greater than zero");

      await expect(TokenPresaleFactory.deploy(
        await mockToken.getAddress(),
        await mockUSDC.getAddress(),
        await mockUSDT.getAddress(),
        TOKEN_PRICE,
        MAX_BUY_LIMIT, // min > max
        MIN_BUY_LIMIT,
        TOTAL_TOKENS_FOR_SALE
      )).to.be.revertedWith("Max buy limit must be greater than min buy limit");

      await expect(TokenPresaleFactory.deploy(
        await mockToken.getAddress(),
        await mockUSDC.getAddress(),
        await mockUSDT.getAddress(),
        TOKEN_PRICE,
        MIN_BUY_LIMIT,
        MAX_BUY_LIMIT,
        0
      )).to.be.revertedWith("Total tokens for sale must be greater than zero");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set token price", async function () {
      const newPrice = ethers.parseUnits("0.05", 6);
      await expect(tokenPresale.setTokenPrice(newPrice))
        .to.emit(tokenPresale, "TokenPriceUpdated")
        .withArgs(newPrice);
      
      expect((await tokenPresale.presaleInfo()).tokenPrice).to.equal(newPrice);
    });

    it("Should allow owner to set min buy limit", async function () {
      const newLimit = ethers.parseUnits("50", 6);
      await expect(tokenPresale.setMinBuyLimit(newLimit))
        .to.emit(tokenPresale, "MinBuyLimitUpdated")
        .withArgs(newLimit);
      
      expect((await tokenPresale.presaleInfo()).minBuyLimit).to.equal(newLimit);
    });

    it("Should allow owner to set max buy limit", async function () {
      const newLimit = ethers.parseUnits("1000", 6);
      await expect(tokenPresale.setMaxBuyLimit(newLimit))
        .to.emit(tokenPresale, "MaxBuyLimitUpdated")
        .withArgs(newLimit);
      
      expect((await tokenPresale.presaleInfo()).maxBuyLimit).to.equal(newLimit);
    });

    it("Should allow owner to set total tokens for sale", async function () {
      const newTotal = ethers.parseUnits("2000000", 18);
      await expect(tokenPresale.setTotalTokensForSale(newTotal))
        .to.emit(tokenPresale, "TotalTokensForSaleUpdated")
        .withArgs(newTotal);
      
      expect((await tokenPresale.presaleInfo()).totalTokensForSale).to.equal(newTotal);
    });

    it("Should allow owner to activate presale", async function () {
      await expect(tokenPresale.setPresaleStatus(true))
        .to.emit(tokenPresale, "PresaleStatusChanged")
        .withArgs(true);
      
      expect(await tokenPresale.isPresaleActive()).to.equal(true);
    });

    it("Should allow owner to stop presale", async function () {
      await tokenPresale.setPresaleStatus(true);
      
      await expect(tokenPresale.stopPresale())
        .to.emit(tokenPresale, "PresaleStatusChanged")
        .withArgs(false);
      
      expect(await tokenPresale.isPresaleActive()).to.equal(false);
    });

    it("Should allow owner to set unlock percentage", async function () {
      const percentage = 2500; // 25%
      const tx = await tokenPresale.setUnlockPercentage(percentage);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      
      await expect(tx)
        .to.emit(tokenPresale, "UnlockPercentageSet")
        .withArgs(percentage, block!.timestamp);
      
      expect((await tokenPresale.presaleInfo()).currentUnlockPercentage).to.equal(percentage);
    });

    it("Should not allow decreasing unlock percentage", async function () {
      await tokenPresale.setUnlockPercentage(3000); // 30%
      
      await expect(tokenPresale.setUnlockPercentage(2000)) // 20%
        .to.be.revertedWith("Cannot decrease unlock percentage");
    });

    it("Should allow owner to unlock all tokens", async function () {
      const tx = await tokenPresale.unlockAllTokens();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      
      await expect(tx)
        .to.emit(tokenPresale, "AllTokensUnlocked")
        .withArgs(block!.timestamp)
        .and.to.emit(tokenPresale, "UnlockPercentageSet")
        .withArgs(10000, block!.timestamp);
      
      expect((await tokenPresale.presaleInfo()).currentUnlockPercentage).to.equal(10000);
    });

    it("Should not allow non-owner to call admin functions", async function () {
      await expect(tokenPresale.connect(user1).setTokenPrice(ethers.parseUnits("0.05", 6)))
        .to.be.revertedWith("Ownable: caller is not the owner");
        
      await expect(tokenPresale.connect(user1).setMinBuyLimit(ethers.parseUnits("50", 6)))
        .to.be.revertedWith("Ownable: caller is not the owner");
        
      await expect(tokenPresale.connect(user1).setMaxBuyLimit(ethers.parseUnits("1000", 6)))
        .to.be.revertedWith("Ownable: caller is not the owner");
        
      await expect(tokenPresale.connect(user1).setPresaleStatus(true))
        .to.be.revertedWith("Ownable: caller is not the owner");
        
      await expect(tokenPresale.connect(user1).setUnlockPercentage(1000))
        .to.be.revertedWith("Ownable: caller is not the owner");
        
      await expect(tokenPresale.connect(user1).unlockAllTokens())
        .to.be.revertedWith("Ownable: caller is not the owner");
        
      await expect(tokenPresale.connect(user1).stopPresale())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should validate admin function parameters", async function () {
      await expect(tokenPresale.setTokenPrice(0))
        .to.be.revertedWith("Price must be greater than zero");
        
      await expect(tokenPresale.setMinBuyLimit(0))
        .to.be.revertedWith("Limit must be greater than zero");
        
      await expect(tokenPresale.setMaxBuyLimit(0))
        .to.be.revertedWith("Limit must be greater than zero");
        
      await expect(tokenPresale.setUnlockPercentage(10001))
        .to.be.revertedWith("Percentage cannot exceed 100%");
    });
  });

  describe("Token Purchase", function () {
    beforeEach(async function () {
      await tokenPresale.setPresaleStatus(true);
    });

    it("Should allow users to buy tokens with USDC", async function () {
      const usdcAmount = ethers.parseUnits("200", 6); // 200 USDC
      const expectedTokens = ethers.parseUnits("5000", 18); // 5000 tokens at 0.04 price

      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      
      await expect(tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount))
        .to.emit(tokenPresale, "TokensPurchased")
        .withArgs(user1.address, await mockUSDC.getAddress(), usdcAmount, expectedTokens);

      const userPurchase = await tokenPresale.getUserPurchase(user1.address);
      expect(userPurchase.totalTokensBought).to.equal(expectedTokens);
      expect(userPurchase.paymentSpent).to.equal(usdcAmount);
      expect(userPurchase.totalClaimedTokens).to.equal(0);
    });

    it("Should allow users to buy tokens with USDT", async function () {
      const usdtAmount = ethers.parseUnits("150", 6); // 150 USDT
      const expectedTokens = ethers.parseUnits("3750", 18); // 3750 tokens at 0.04 price

      await mockUSDT.connect(user1).approve(await tokenPresale.getAddress(), usdtAmount);
      
      await expect(tokenPresale.connect(user1).buyTokens(await mockUSDT.getAddress(), usdtAmount))
        .to.emit(tokenPresale, "TokensPurchased")
        .withArgs(user1.address, await mockUSDT.getAddress(), usdtAmount, expectedTokens);

      const userPurchase = await tokenPresale.getUserPurchase(user1.address);
      expect(userPurchase.totalTokensBought).to.equal(expectedTokens);
      expect(userPurchase.paymentSpent).to.equal(usdtAmount);
      expect(userPurchase.totalClaimedTokens).to.equal(0);
    });

    it("Should reject purchase below minimum limit", async function () {
      const usdcAmount = ethers.parseUnits("50", 6); // Below 100 minimum

      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await expect(tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount))
        .to.be.revertedWith("Payment amount below minimum limit");
    });

    it("Should track multiple purchases from same user", async function () {
      const usdcAmount1 = ethers.parseUnits("200", 6); // Changed to meet minimum
      const usdcAmount2 = ethers.parseUnits("150", 6); // Changed to meet minimum
      const expectedTokens1 = ethers.parseUnits("5000", 18); // Updated calculation
      const expectedTokens2 = ethers.parseUnits("3750", 18); // Updated calculation

      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount1 + usdcAmount2);
      
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount1);
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount2);

      const userPurchase = await tokenPresale.getUserPurchase(user1.address);
      expect(userPurchase.totalTokensBought).to.equal(expectedTokens1 + expectedTokens2);
      expect(userPurchase.paymentSpent).to.equal(usdcAmount1 + usdcAmount2);
    });

    it("Should track total presale statistics", async function () {
      const usdcAmount = ethers.parseUnits("200", 6); // Changed to get expected tokens right
      const expectedTokens = ethers.parseUnits("5000", 18); // Updated calculation

      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await mockUSDC.connect(user2).approve(await tokenPresale.getAddress(), usdcAmount);
      
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount);
      await tokenPresale.connect(user2).buyTokens(await mockUSDC.getAddress(), usdcAmount);

      const presaleInfo = await tokenPresale.presaleInfo();
      expect(presaleInfo.totalTokensSold).to.equal(expectedTokens * 2n);
      expect(presaleInfo.totalPaymentRaised).to.equal(usdcAmount * 2n);
      expect(await tokenPresale.getTotalPurchasers()).to.equal(2);
    });

    it("Should not allow purchase when presale is inactive", async function () {
      await tokenPresale.setPresaleStatus(false);
      const usdcAmount = ethers.parseUnits("200", 6);

      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await expect(tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount))
        .to.be.revertedWith("Presale is not active");
    });

    it("Should not allow purchase exceeding max buy limit", async function () {
      const usdcAmount = ethers.parseUnits("600", 6); // Exceeds 500 max

      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await expect(tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount))
        .to.be.revertedWith("Would exceed maximum buy limit");
    });

    it("Should not allow purchase with unaccepted payment token", async function () {
      // Deploy a different token that's not accepted
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const otherToken = await MockERC20Factory.deploy("Other Token", "OTHER", 6);
      
      const amount = ethers.parseUnits("200", 6);
      await otherToken.approve(await tokenPresale.getAddress(), amount);
      
      await expect(tokenPresale.buyTokens(await otherToken.getAddress(), amount))
        .to.be.revertedWith("Payment token not accepted");
    });

    it("Should not allow purchase with insufficient payment token approval", async function () {
      const usdcAmount = ethers.parseUnits("200", 6);

      await expect(tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount))
        .to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should not allow zero payment purchase", async function () {
      await expect(tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), 0))
        .to.be.revertedWith("Payment amount below minimum limit");
    });
  });

  describe("Token Status View Functions", function () {
    beforeEach(async function () {
      await tokenPresale.setPresaleStatus(true);
      
      // User1 buys 5000 tokens (200 USDC)
      const usdcAmount = ethers.parseUnits("200", 6);
      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount);
    });

    it("Should return correct individual token amounts", async function () {
      const tokensBought = ethers.parseUnits("5000", 18);
      
      // Initially all tokens are locked
      expect(await tokenPresale.getUnlockedAmount(user1.address)).to.equal(0);
      expect(await tokenPresale.getLockedAmount(user1.address)).to.equal(tokensBought);
      expect(await tokenPresale.getClaimedAmount(user1.address)).to.equal(0);
      expect(await tokenPresale.getClaimableAmount(user1.address)).to.equal(0);
      
      // Unlock 30%
      await tokenPresale.setUnlockPercentage(3000);
      const unlocked30 = tokensBought * 30n / 100n;
      
      expect(await tokenPresale.getUnlockedAmount(user1.address)).to.equal(unlocked30);
      expect(await tokenPresale.getLockedAmount(user1.address)).to.equal(tokensBought - unlocked30);
      expect(await tokenPresale.getClaimedAmount(user1.address)).to.equal(0);
      expect(await tokenPresale.getClaimableAmount(user1.address)).to.equal(unlocked30);
      
      // User claims tokens
      await tokenPresale.connect(user1).claimTokens();
      
      expect(await tokenPresale.getUnlockedAmount(user1.address)).to.equal(unlocked30);
      expect(await tokenPresale.getLockedAmount(user1.address)).to.equal(tokensBought - unlocked30);
      expect(await tokenPresale.getClaimedAmount(user1.address)).to.equal(unlocked30);
      expect(await tokenPresale.getClaimableAmount(user1.address)).to.equal(0); // Nothing left to claim
    });

    it("Should return comprehensive user token status", async function () {
      const tokensBought = ethers.parseUnits("5000", 18);
      
      // Initially all tokens are locked
      let status = await tokenPresale.getUserTokenStatus(user1.address);
      expect(status.totalTokensBought).to.equal(tokensBought);
      expect(status.totalUnlockedTokens).to.equal(0);
      expect(status.totalClaimedTokens).to.equal(0);
      expect(status.totalLockedTokens).to.equal(tokensBought);
      expect(status.claimableTokens).to.equal(0);
      
      // Unlock 40%
      await tokenPresale.setUnlockPercentage(4000);
      const unlocked40 = tokensBought * 40n / 100n;
      const locked60 = tokensBought - unlocked40;
      
      status = await tokenPresale.getUserTokenStatus(user1.address);
      expect(status.totalTokensBought).to.equal(tokensBought);
      expect(status.totalUnlockedTokens).to.equal(unlocked40);
      expect(status.totalClaimedTokens).to.equal(0);
      expect(status.totalLockedTokens).to.equal(locked60);
      expect(status.claimableTokens).to.equal(unlocked40);
      
      // User claims tokens
      await tokenPresale.connect(user1).claimTokens();
      
      status = await tokenPresale.getUserTokenStatus(user1.address);
      expect(status.totalTokensBought).to.equal(tokensBought);
      expect(status.totalUnlockedTokens).to.equal(unlocked40);
      expect(status.totalClaimedTokens).to.equal(unlocked40);
      expect(status.totalLockedTokens).to.equal(locked60);
      expect(status.claimableTokens).to.equal(0); // Nothing left to claim
    });

    it("Should return zero for users who haven't purchased", async function () {
      expect(await tokenPresale.getUnlockedAmount(user3.address)).to.equal(0);
      expect(await tokenPresale.getLockedAmount(user3.address)).to.equal(0);
      expect(await tokenPresale.getClaimedAmount(user3.address)).to.equal(0);
      expect(await tokenPresale.getClaimableAmount(user3.address)).to.equal(0);
      
      const status = await tokenPresale.getUserTokenStatus(user3.address);
      expect(status.totalTokensBought).to.equal(0);
      expect(status.totalUnlockedTokens).to.equal(0);
      expect(status.totalClaimedTokens).to.equal(0);
      expect(status.totalLockedTokens).to.equal(0);
      expect(status.claimableTokens).to.equal(0);
    });
  });

  describe("Token Claiming - Anti-Double-Claim Protection", function () {
    beforeEach(async function () {
      await tokenPresale.setPresaleStatus(true);
      
      // User1 and User2 buy tokens
      const usdcAmount = ethers.parseUnits("200", 6);
      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await mockUSDC.connect(user2).approve(await tokenPresale.getAddress(), usdcAmount);
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount);
      await tokenPresale.connect(user2).buyTokens(await mockUSDC.getAddress(), usdcAmount);
    });

    it("Should track sold percentage correctly", async function () {
      const soldPercentage = await tokenPresale.getSoldPercentage();
      const extendedInfo = await tokenPresale.getExtendedPresaleInfo();
      
      // 10000 tokens sold out of 1M = 1%
      expect(soldPercentage).to.equal(100); // 1% * 100 precision = 100
      expect(extendedInfo.soldPercentage).to.equal(100);
    });
  });

  describe("Emergency Functions", function () {
    beforeEach(async function () {
      await tokenPresale.setPresaleStatus(true);
      const usdcAmount = ethers.parseUnits("200", 6);
      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount);
    });

    it("Should allow owner to withdraw USDC", async function () {
      const withdrawAmount = ethers.parseUnits("100", 6);
      const initialBalance = await mockUSDC.balanceOf(owner.address);
      
      await expect(tokenPresale.withdrawUSDC(withdrawAmount))
        .to.emit(tokenPresale, "PaymentWithdrawn")
        .withArgs(await mockUSDC.getAddress(), owner.address, withdrawAmount);
      
      const finalBalance = await mockUSDC.balanceOf(owner.address);
      expect(finalBalance - initialBalance).to.equal(withdrawAmount);
    });

    it("Should allow owner to emergency withdraw tokens", async function () {
      const withdrawAmount = ethers.parseUnits("1000", 18);
      const initialBalance = await mockToken.balanceOf(owner.address);
      
      await expect(tokenPresale.emergencyWithdrawTokens(withdrawAmount))
        .to.emit(tokenPresale, "EmergencyWithdraw")
        .withArgs(owner.address, withdrawAmount);
      
      const finalBalance = await mockToken.balanceOf(owner.address);
      expect(finalBalance - initialBalance).to.equal(withdrawAmount);
    });

    it("Should not allow withdrawing more than contract balance", async function () {
      const contractUsdcBalance = await tokenPresale.getContractUsdcBalance();
      const excessiveAmount = contractUsdcBalance + ethers.parseUnits("1", 6);
      
      await expect(tokenPresale.withdrawUSDC(excessiveAmount))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(tokenPresale.connect(user1).withdrawUSDC(ethers.parseUnits("10", 6)))
        .to.be.revertedWith("Ownable: caller is not the owner");
        
      await expect(tokenPresale.connect(user1).emergencyWithdrawTokens(ethers.parseUnits("100", 18)))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Pausable Functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      await tokenPresale.setPresaleStatus(true);
      
      // First, verify normal operation works
      const usdcAmount = ethers.parseUnits("200", 6);
      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount);
      
      // Pause the contract
      await tokenPresale.pause();
      
      // Verify that token purchases are blocked when paused
      await mockUSDC.connect(user2).approve(await tokenPresale.getAddress(), usdcAmount);
      await expect(tokenPresale.connect(user2).buyTokens(await mockUSDC.getAddress(), usdcAmount))
        .to.be.revertedWith("Pausable: paused");
      
      // Verify that token claims are blocked when paused
      await tokenPresale.setUnlockPercentage(5000); // Unlock 50%
      await expect(tokenPresale.connect(user1).claimTokens())
        .to.be.revertedWith("Pausable: paused");
      
      // Unpause and verify operations work again
      await tokenPresale.unpause();
      
      // Should be able to buy tokens again
      await tokenPresale.connect(user2).buyTokens(await mockUSDC.getAddress(), usdcAmount);
      
      // Should be able to claim tokens again
      await tokenPresale.connect(user1).claimTokens();
      
      // Verify the purchase and claim worked
      const user2Purchase = await tokenPresale.getUserPurchase(user2.address);
      expect(user2Purchase.totalTokensBought).to.be.gt(0);
      
      const user1Purchase = await tokenPresale.getUserPurchase(user1.address);
      expect(user1Purchase.totalClaimedTokens).to.be.gt(0);
    });
  });

  describe("View Functions", function () {
    it("Should return correct contract balances", async function () {
      const tokenBalance = await tokenPresale.getContractTokenBalance();
      const usdcBalance = await tokenPresale.getContractUsdcBalance();
      
      expect(tokenBalance).to.equal(PRESALE_TOKEN_AMOUNT);
      expect(usdcBalance).to.equal(0);
    });

    it("Should return correct presale info", async function () {
      const info = await tokenPresale.presaleInfo();
      expect(info.token).to.equal(await mockToken.getAddress());
      expect(info.paymentToken).to.equal(await mockUSDC.getAddress());
      expect(info.tokenPrice).to.equal(TOKEN_PRICE);
      expect(info.minBuyLimit).to.equal(MIN_BUY_LIMIT);
      expect(info.maxBuyLimit).to.equal(MAX_BUY_LIMIT);
      expect(info.totalTokensForSale).to.equal(TOTAL_TOKENS_FOR_SALE);
    });

    it("Should return correct user purchase info", async function () {
      await tokenPresale.setPresaleStatus(true);
      const usdcAmount = ethers.parseUnits("200", 6); // Updated amount
      const expectedTokens = ethers.parseUnits("5000", 18); // Updated calculation
      
      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount);
      
      const purchase = await tokenPresale.getUserPurchase(user1.address);
      expect(purchase.totalTokensBought).to.equal(expectedTokens);
      expect(purchase.paymentSpent).to.equal(usdcAmount);
      expect(purchase.totalClaimedTokens).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small payment amounts", async function () {
      await tokenPresale.setPresaleStatus(true);
      const smallAmount = ethers.parseUnits("100", 6); // Use minimum amount to avoid minimum limit error
      
      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), smallAmount);
      
      // This should work since it meets minimum limit
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), smallAmount);
      const purchase = await tokenPresale.getUserPurchase(user1.address);
      expect(purchase.paymentSpent).to.equal(smallAmount);
    });

    it("Should handle price updates after purchases", async function () {
      await tokenPresale.setPresaleStatus(true);
      
      // Buy tokens at original price (0.04)
      const usdcAmount = ethers.parseUnits("200", 6);
      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount);
      
      // Change price to 0.08 (double the price)
      const newPrice = ethers.parseUnits("0.08", 6);
      await tokenPresale.setTokenPrice(newPrice);
      
      // Buy more tokens at new price
      await mockUSDC.connect(user1).approve(await tokenPresale.getAddress(), usdcAmount);
      await tokenPresale.connect(user1).buyTokens(await mockUSDC.getAddress(), usdcAmount);
      
      const purchase = await tokenPresale.getUserPurchase(user1.address);
      // First purchase: 200 USDC / 0.04 = 5000 tokens
      // Second purchase: 200 USDC / 0.08 = 2500 tokens
      // Total: 7500 tokens
      expect(purchase.totalTokensBought).to.equal(ethers.parseUnits("7500", 18));
    });
  });
}); 