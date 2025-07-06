import { expect } from "chai";
import { ethers } from "hardhat";
import { Bridge, TokenManager, Oracle } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Bridge", function () {
  let bridge: Bridge;
  let tokenManager: TokenManager;
  let oracle: Oracle;
  let owner: SignerWithAddress;
  let offchainProcessor: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  
  const TRANSFER_FEE = 100n; // 1%
  const OPERATION_FEE = ethers.parseEther("1"); // 1 token
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const BRIDGE_AMOUNT = ethers.parseEther("100"); // 100 tokens for testing

  beforeEach(async function () {
    // Get signers
    [owner, offchainProcessor, user1, user2] = await ethers.getSigners();

    // Deploy Oracle first
    const OracleFactory = await ethers.getContractFactory("Oracle");
    oracle = await OracleFactory.deploy(owner.address);
    await oracle.waitForDeployment();

    // Deploy TokenManager
    const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
    tokenManager = await TokenManagerFactory.deploy(
      "Merlin",
      "MRLN",
      INITIAL_SUPPLY
    );
    await tokenManager.waitForDeployment();

    // Deploy Bridge
    const BridgeFactory = await ethers.getContractFactory("Bridge");
    bridge = await BridgeFactory.deploy(
      await tokenManager.getAddress(),
      TRANSFER_FEE,
      OPERATION_FEE,
      await oracle.getAddress(),
      offchainProcessor.address
    );
    await bridge.waitForDeployment();

    // Set bridge in Oracle
    await oracle.setBridge(await bridge.getAddress());

    // Set bridge and oracle in TokenManager
    await tokenManager.setBridgeAndOracle(await bridge.getAddress(), await oracle.getAddress());

    // Complete ownership transfer for Bridge (required by Ownable2Step)
    const oracleSigner = await ethers.getImpersonatedSigner(await oracle.getAddress());
    await ethers.provider.send("hardhat_setBalance", [
      oracleSigner.address,
      "0x1000000000000000000"
    ]);
    await bridge.connect(oracleSigner).acceptOwnership();

    // Transfer some tokens to user1 for testing
    await tokenManager.transfer(user1.address, BRIDGE_AMOUNT);
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await bridge.owner()).to.equal(await oracle.getAddress());
    });

    it("Should set the correct token address", async function () {
      expect(await bridge.tokenAddress()).to.equal(await tokenManager.getAddress());
    });

    it("Should set the correct fees", async function () {
      expect(await bridge.transferFee()).to.equal(TRANSFER_FEE);
      expect(await bridge.operationFee()).to.equal(OPERATION_FEE);
    });

    it("Should set the correct offchain processor", async function () {
      expect(await bridge.offchainProcessor()).to.equal(offchainProcessor.address);
    });
  });

  describe("Bridge Operations", function () {
    beforeEach(async function () {
      // Approve bridge to spend user1's tokens
      await tokenManager.connect(user1).approve(await bridge.getAddress(), BRIDGE_AMOUNT);
    });

    it("Should allow user to bridge tokens", async function () {
      const bridgeAmount = ethers.parseEther("10");
      await expect(bridge.connect(user1).receiveAsset(bridgeAmount, "ETH", user2.address))
        .to.emit(bridge, "BridgeStarted")
        .withArgs(user1.address, bridgeAmount, bridgeAmount - (bridgeAmount * TRANSFER_FEE) / 10000n - OPERATION_FEE, "ETH", user2.address);
    });

    it("Should allow admin to bridge without fees", async function () {
      const bridgeAmount = ethers.parseEther("10");
      // Get Oracle signer since it's the owner
      const oracleSigner = await ethers.getImpersonatedSigner(await oracle.getAddress());
      await ethers.provider.send("hardhat_setBalance", [
        oracleSigner.address,
        "0x1000000000000000000"
      ]);
      
      // Transfer tokens to Oracle and approve Bridge
      await tokenManager.transfer(await oracle.getAddress(), bridgeAmount);
      await tokenManager.connect(oracleSigner).approve(await bridge.getAddress(), bridgeAmount);
      
      await expect(bridge.connect(oracleSigner).receiveAsset(bridgeAmount, "ETH", user2.address))
        .to.emit(bridge, "BridgeStarted")
        .withArgs(await oracle.getAddress(), bridgeAmount, bridgeAmount, "ETH", user2.address);
    });

    it("Should allow offchain processor to mint tokens", async function () {
      const mintAmount = ethers.parseEther("10");
      await expect(bridge.connect(offchainProcessor).mintAsset(user1.address, mintAmount))
        .to.emit(bridge, "AssetMinted")
        .withArgs(user1.address, mintAmount);
    });
  });

  describe("Fee Management", function () {
    it("Should allow oracle to update transfer fee", async function () {
      const newFee = 200n;
      // Call through Oracle contract instead of directly
      await oracle.updateTransferFee(newFee);
      expect(await bridge.transferFee()).to.equal(newFee);
    });

    it("Should allow oracle to update operation fee", async function () {
      const newFee = ethers.parseEther("2");
      // Call through Oracle contract instead of directly
      await oracle.updateOperationFee(newFee);
      expect(await bridge.operationFee()).to.equal(newFee);
    });

    it("Should allow oracle to withdraw fees", async function () {
      // First bridge some tokens to generate fees
      const bridgeAmount = ethers.parseEther("100");
      await tokenManager.connect(user1).approve(await bridge.getAddress(), bridgeAmount);
      await bridge.connect(user1).receiveAsset(bridgeAmount, "ETH", user2.address);

      // Calculate expected fees
      const transferFeeAmount = (bridgeAmount * TRANSFER_FEE) / 10000n;
      const totalFee = transferFeeAmount + OPERATION_FEE;

      // Withdraw fees through Oracle contract
      await expect(oracle.withdrawFeesTo(user2.address))
        .to.emit(bridge, "FeesWithdrawn")
        .withArgs(user2.address, totalFee);

      // Verify user2 received the fees
      expect(await tokenManager.balanceOf(user2.address)).to.equal(totalFee);
    });
  });
}); 