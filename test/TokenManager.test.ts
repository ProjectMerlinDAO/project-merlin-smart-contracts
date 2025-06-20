import { expect } from "chai";
import { ethers } from "hardhat";
import { TokenManager, Bridge, Oracle } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TokenManager", function () {
  let tokenManager: TokenManager;
  let bridge: Bridge;
  let oracle: Oracle;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const TOKEN_NAME = "Merlin";
  const TOKEN_SYMBOL = "MRLN";
  const TOTAL_SUPPLY = ethers.parseEther("800000000");
  const BRIDGE_AMOUNT = ethers.parseEther("100000000");
  const TRANSFER_FEE = 100n; // 1% (100 basis points)
  const OPERATION_FEE = ethers.parseEther("1"); // 1 MRLN token

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
    tokenManager = await TokenManagerFactory.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOTAL_SUPPLY,
      BRIDGE_AMOUNT,
      TRANSFER_FEE,
      OPERATION_FEE
    ) as TokenManager;

    // Get the deployed Bridge and Oracle addresses
    const bridgeAddress = await tokenManager.bridge();
    const oracleAddress = await tokenManager.oracle();

    // Get contract instances
    bridge = await ethers.getContractAt("Bridge", bridgeAddress) as Bridge;
    oracle = await ethers.getContractAt("Oracle", oracleAddress) as Oracle;

    // Accept ownership for Oracle (required by Ownable2Step)
    await oracle.connect(owner).acceptOwnership();
    
    // Set bridge address in Oracle
    await oracle.setBridge(bridgeAddress);

    // For Bridge, the owner is Oracle, so we need to impersonate Oracle to accept ownership
    const oracleSigner = await ethers.getImpersonatedSigner(oracleAddress);
    await ethers.provider.send("hardhat_setBalance", [
      oracleSigner.address,
      "0x1000000000000000000"
    ]);
    
    // Accept ownership for Bridge (required by Ownable2Step)
    await bridge.connect(oracleSigner).acceptOwnership();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await tokenManager.owner()).to.equal(owner.address);
    });

    it("Should set the correct token details", async function () {
      expect(await tokenManager.name()).to.equal(TOKEN_NAME);
      expect(await tokenManager.symbol()).to.equal(TOKEN_SYMBOL);
      expect(await tokenManager.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it("Should deploy Bridge and Oracle with correct configuration", async function () {
      expect(await tokenManager.bridge()).to.not.equal(ethers.ZeroAddress);
      expect(await tokenManager.oracle()).to.not.equal(ethers.ZeroAddress);
      
      // Check Bridge configuration
      expect(await bridge.tokenAddress()).to.equal(await tokenManager.getAddress());
      expect(await bridge.transferFee()).to.equal(TRANSFER_FEE);
      expect(await bridge.operationFee()).to.equal(OPERATION_FEE);
      
      // Check Oracle ownership and setup
      expect(await oracle.owner()).to.equal(owner.address);
      expect(await bridge.owner()).to.equal(await oracle.getAddress());
      expect(await oracle.bridge()).to.equal(await bridge.getAddress());
    });

    it("Should distribute tokens correctly", async function () {
      const ownerBalance = await tokenManager.balanceOf(owner.address);
      const bridgeBalance = await tokenManager.balanceOf(await bridge.getAddress());
      
      expect(bridgeBalance).to.equal(BRIDGE_AMOUNT);
      expect(ownerBalance).to.equal(TOTAL_SUPPLY - BRIDGE_AMOUNT);
    });
  });

  describe("Bridge Integration", function () {
    const transferAmount = ethers.parseEther("1000");
    
    beforeEach(async function () {
      // Transfer some tokens to user1 for testing
      await tokenManager.transfer(user1.address, transferAmount);
    });

    it("Should allow Bridge to burn tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      await expect(bridge.connect(user1).receiveAsset(
        burnAmount,
        "ethereum",
        user2.address
      )).to.be.revertedWith("Insufficient allowance");

      // Approve bridge to spend tokens
      await tokenManager.connect(user1).approve(bridge.getAddress(), burnAmount);

      const initialSupply = await tokenManager.totalSupply();
      await bridge.connect(user1).receiveAsset(burnAmount, "ethereum", user2.address);
      
      const finalSupply = await tokenManager.totalSupply();
      const fee = (burnAmount * TRANSFER_FEE) / 10000n + OPERATION_FEE;
      const burnedAmount = burnAmount - fee;
      
      expect(initialSupply - finalSupply).to.equal(burnedAmount);
    });

    it("Should allow Bridge to mint tokens", async function () {
      const mintAmount = ethers.parseEther("100");
      const initialSupply = await tokenManager.totalSupply();
      
      // Only offchain processor (initially the owner) can mint
      await expect(bridge.connect(user1).mintAsset(user2.address, mintAmount))
        .to.be.revertedWith("Only Offchain Processor allowed to call this method");
      
      // Should succeed when called by owner (initial offchain processor)
      await bridge.connect(owner).mintAsset(user2.address, mintAmount);
      
      // Change offchain processor to user1
      const oracleSigner = await ethers.getImpersonatedSigner(await oracle.getAddress());
      await ethers.provider.send("hardhat_setBalance", [
        await oracleSigner.getAddress(),
        "0x1000000000000000000"
      ]);
      
      await bridge.connect(oracleSigner).changeOffchain(user1.address);
      
      // Now only user1 can mint
      await expect(bridge.connect(owner).mintAsset(user2.address, mintAmount))
        .to.be.revertedWith("Only Offchain Processor allowed to call this method");
      
      await bridge.connect(user1).mintAsset(user2.address, mintAmount);
      
      const finalSupply = await tokenManager.totalSupply();
      expect(finalSupply - initialSupply).to.equal(mintAmount * 2n);
      expect(await tokenManager.balanceOf(user2.address)).to.equal(mintAmount * 2n);
    });
  });

  describe("Oracle Controls", function () {
    it("Should allow Oracle to update fees", async function () {
      const newTransferFee = 200n; // 2%
      const newOperationFee = ethers.parseEther("2"); // 2 MRLN tokens

      // Oracle needs to call these functions through the Oracle contract
      await oracle.updateTransferFee(newTransferFee);
      await oracle.updateOperationFee(newOperationFee);

      expect(await bridge.transferFee()).to.equal(newTransferFee);
      expect(await bridge.operationFee()).to.equal(newOperationFee);
    });

    it("Should allow Oracle to pause/unpause bridge", async function () {
      await oracle.pauseBridge();
      
      // Try to use bridge while paused
      const burnAmount = ethers.parseEther("100");
      await tokenManager.connect(user1).approve(bridge.getAddress(), burnAmount);
      
      await expect(bridge.connect(user1).receiveAsset(
        burnAmount,
        "ethereum",
        user2.address
      )).to.be.revertedWith("Pausable: paused");

      await oracle.unpauseBridge();
      // Now bridge operations should work (with proper allowance)
    });
  });
}); 