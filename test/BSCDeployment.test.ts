import { expect } from "chai";
import { ethers } from "hardhat";
import { TokenManager, Bridge, Oracle } from "../typechain-types";

describe("BSC Testnet Deployed Contracts", function () {
  // BSC Testnet deployed contract addresses
  const DEPLOYED_ADDRESSES = {
    ORACLE: "0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9",
    TOKEN_MANAGER: "0xa64D0bCB4b6325C1ed68749727eA544366cca30e",
    BRIDGE: "0xf42Bd569fffAE367716412D0C8d3605c204390c2"
  };

  let tokenManager: TokenManager;
  let bridge: Bridge;
  let oracle: Oracle;
  let deployer: any;
  let user1: any;

  before(async function () {
    // Check if we're on BSC testnet
    const network = await ethers.provider.getNetwork();
    if (network.chainId !== 97n) {
      console.log(`⚠️ Warning: Not on BSC Testnet (Chain ID: 97). Current: ${network.chainId}`);
      console.log("These tests are designed for BSC Testnet deployed contracts");
    }

    // Get signers
    const signers = await ethers.getSigners();
    deployer = signers[0];
    user1 = signers[1] || signers[0]; // Use deployer as user1 if no second signer
    console.log("Testing with deployer:", deployer.address);
    console.log("User1 address:", user1.address);

    // Connect to deployed contracts
    tokenManager = await ethers.getContractAt("TokenManager", DEPLOYED_ADDRESSES.TOKEN_MANAGER) as TokenManager;
    bridge = await ethers.getContractAt("Bridge", DEPLOYED_ADDRESSES.BRIDGE) as Bridge;
    oracle = await ethers.getContractAt("Oracle", DEPLOYED_ADDRESSES.ORACLE) as Oracle;

    console.log("Connected to deployed contracts:");
    console.log("- TokenManager:", await tokenManager.getAddress());
    console.log("- Bridge:", await bridge.getAddress());
    console.log("- Oracle:", await oracle.getAddress());
  });

  describe("Contract Connectivity", function () {
    it("Should connect to all deployed contracts", async function () {
      expect(await tokenManager.getAddress()).to.equal(DEPLOYED_ADDRESSES.TOKEN_MANAGER);
      expect(await bridge.getAddress()).to.equal(DEPLOYED_ADDRESSES.BRIDGE);
      expect(await oracle.getAddress()).to.equal(DEPLOYED_ADDRESSES.ORACLE);
    });

    it("Should have correct contract linkages", async function () {
      // Check TokenManager links to Bridge and Oracle
      expect(await tokenManager.bridge()).to.equal(DEPLOYED_ADDRESSES.BRIDGE);
      expect(await tokenManager.oracle()).to.equal(DEPLOYED_ADDRESSES.ORACLE);

      // Check Bridge links to TokenManager
      expect(await bridge.tokenAddress()).to.equal(DEPLOYED_ADDRESSES.TOKEN_MANAGER);

      // Check Oracle links to Bridge
      expect(await oracle.bridge()).to.equal(DEPLOYED_ADDRESSES.BRIDGE);
    });
  });

  describe("TokenManager Basic Functionality", function () {
    it("Should have correct token details", async function () {
      const name = await tokenManager.name();
      const symbol = await tokenManager.symbol();
      const totalSupply = await tokenManager.totalSupply();

      console.log("Token Name:", name);
      console.log("Token Symbol:", symbol);
      console.log("Total Supply:", ethers.formatEther(totalSupply));

      expect(name).to.include("Merlin");
      expect(symbol).to.include("MRLN");
      expect(totalSupply).to.be.gt(0);
    });

    it("Should have deployer as owner", async function () {
      const owner = await tokenManager.owner();
      expect(owner).to.equal(deployer.address);
    });

    it("Should have tokens in deployer wallet", async function () {
      const deployerBalance = await tokenManager.balanceOf(deployer.address);
      console.log("Deployer balance:", ethers.formatEther(deployerBalance), "tokens");
      expect(deployerBalance).to.be.gt(0);
    });

    it("Should have tokens allocated to bridge", async function () {
      const bridgeBalance = await tokenManager.balanceOf(DEPLOYED_ADDRESSES.BRIDGE);
      console.log("Bridge balance:", ethers.formatEther(bridgeBalance), "tokens");
      expect(bridgeBalance).to.be.gt(0);
    });
  });

  describe("Token Transfer Functionality", function () {
    const transferAmount = ethers.parseEther("10"); // 10 tokens

    it("Should allow token transfers", async function () {
      // Check deployer has enough balance
      const deployerBalance = await tokenManager.balanceOf(deployer.address);
      expect(deployerBalance).to.be.gte(transferAmount);

      // Check user1 initial balance
      const user1BalanceBefore = await tokenManager.balanceOf(user1.address);

      // Transfer tokens
      const tx = await tokenManager.transfer(user1.address, transferAmount);
      await tx.wait();

      // Check balances after transfer
      const user1BalanceAfter = await tokenManager.balanceOf(user1.address);
      const deployerBalanceAfter = await tokenManager.balanceOf(deployer.address);

      expect(user1BalanceAfter - user1BalanceBefore).to.equal(transferAmount);
      expect(deployerBalance - deployerBalanceAfter).to.equal(transferAmount);

      console.log("✅ Transfer successful:");
      console.log("- Amount:", ethers.formatEther(transferAmount));
      console.log("- User1 new balance:", ethers.formatEther(user1BalanceAfter));
      console.log("- Transaction hash:", tx.hash);
    });

    it("Should allow token approvals and transferFrom", async function () {
      const approveAmount = ethers.parseEther("5");

      // User1 approves deployer to spend tokens
      await tokenManager.connect(user1).approve(deployer.address, approveAmount);

      // Check allowance
      const allowance = await tokenManager.allowance(user1.address, deployer.address);
      expect(allowance).to.equal(approveAmount);

      // Transfer from user1 to deployer using allowance
      const user1BalanceBefore = await tokenManager.balanceOf(user1.address);
      const deployerBalanceBefore = await tokenManager.balanceOf(deployer.address);

      await tokenManager.transferFrom(user1.address, deployer.address, approveAmount);

      const user1BalanceAfter = await tokenManager.balanceOf(user1.address);
      const deployerBalanceAfter = await tokenManager.balanceOf(deployer.address);

      expect(user1BalanceBefore - user1BalanceAfter).to.equal(approveAmount);
      expect(deployerBalanceAfter - deployerBalanceBefore).to.equal(approveAmount);

      console.log("✅ TransferFrom successful");
    });
  });

  describe("Bridge Configuration", function () {
    it("Should have correct bridge configuration", async function () {
      const transferFee = await bridge.transferFee();
      const operationFee = await bridge.operationFee();
      const owner = await bridge.owner();
      const offchainProcessor = await bridge.offchainProcessor();

      console.log("Bridge Configuration:");
      console.log("- Transfer Fee:", transferFee.toString(), "basis points");
      console.log("- Operation Fee:", ethers.formatEther(operationFee), "tokens");
      console.log("- Owner:", owner);
      console.log("- Offchain Processor:", offchainProcessor);

      expect(transferFee).to.be.gt(0);
      expect(operationFee).to.be.gt(0);
      expect(owner).to.equal(DEPLOYED_ADDRESSES.ORACLE);
    });

    it("Should not be paused", async function () {
      const isPaused = await bridge.paused();
      expect(isPaused).to.be.false;
      console.log("✅ Bridge is not paused");
    });
  });

  describe("Oracle Configuration", function () {
    it("Should have correct oracle configuration", async function () {
      const owner = await oracle.owner();
      const bridgeAddress = await oracle.bridge();

      console.log("Oracle Configuration:");
      console.log("- Owner:", owner);
      console.log("- Bridge:", bridgeAddress);

      expect(owner).to.equal(deployer.address);
      expect(bridgeAddress).to.equal(DEPLOYED_ADDRESSES.BRIDGE);
    });
  });

  describe("Bridge Operations (Read-only)", function () {
    it("Should calculate bridge fees correctly", async function () {
      const testAmount = ethers.parseEther("100");
      const transferFee = await bridge.transferFee();
      const operationFee = await bridge.operationFee();

      // Calculate expected fees
      const transferFeeAmount = (testAmount * transferFee) / 10000n;
      const totalFee = transferFeeAmount + operationFee;
      const amountAfterFee = testAmount - totalFee;

      console.log("Fee Calculation for", ethers.formatEther(testAmount), "tokens:");
      console.log("- Transfer Fee Amount:", ethers.formatEther(transferFeeAmount));
      console.log("- Operation Fee:", ethers.formatEther(operationFee));
      console.log("- Total Fee:", ethers.formatEther(totalFee));
      console.log("- Amount After Fee:", ethers.formatEther(amountAfterFee));

      expect(totalFee).to.be.lt(testAmount);
      expect(amountAfterFee).to.be.gt(0);
    });
  });

  describe("Network Information", function () {
    it("Should display network and account information", async function () {
      const network = await ethers.provider.getNetwork();
      const blockNumber = await ethers.provider.getBlockNumber();
      const deployerBalance = await ethers.provider.getBalance(deployer.address);
      const feeData = await ethers.provider.getFeeData();

      console.log("\n📊 Network Information:");
      console.log("- Network:", network.name);
      console.log("- Chain ID:", network.chainId.toString());
      console.log("- Block Number:", blockNumber);
      console.log("- Deployer BNB Balance:", ethers.formatEther(deployerBalance));
      console.log("- Gas Price:", ethers.formatUnits(feeData.gasPrice || 0n, "gwei"), "gwei");

      expect(network.chainId).to.equal(97n); // BSC Testnet
    });

    it("Should show contract links for verification", async function () {
      console.log("\n🔗 Contract Links on BSCScan:");
      console.log(`- Oracle: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.ORACLE}`);
      console.log(`- TokenManager: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.TOKEN_MANAGER}`);
      console.log(`- Bridge: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.BRIDGE}`);

      // This is just for display, always passes
      expect(true).to.be.true;
    });
  });

  describe("Security Checks", function () {
    it("Should not allow non-owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("100");
      
      await expect(
        tokenManager.connect(user1).mint(user1.address, mintAmount)
      ).to.be.revertedWith("Only bridge or owner can call this");
    });

    it("Should not allow non-owner to burn tokens without allowance", async function () {
      const burnAmount = ethers.parseEther("1");
      
      await expect(
        tokenManager.connect(user1).burnFrom(deployer.address, burnAmount)
      ).to.be.revertedWith("Only bridge or owner can call this");
    });

    it("Should not allow non-oracle to update bridge fees", async function () {
      await expect(
        bridge.connect(user1).updateTransferFee(200)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 