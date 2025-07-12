import { ethers } from "hardhat";
import { delay } from "./utils";
import hre from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=".repeat(60));
  console.log("🚀 BRIDGE DEPLOYMENT - PROJECT MERLIN");
  console.log("=".repeat(60));

  // Network validation and configuration
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");

  // Validate BSC Mainnet
  if (chainId !== 56) {
    throw new Error(`This script is for BSC Mainnet (Chain ID: 56). Current network: ${chainId}`);
  }

  // Get TokenManager address from environment variable
  const tokenManagerAddress = process.env.TOKEN_MANAGER_ADDRESS;
  if (!tokenManagerAddress) {
    throw new Error("Please provide TOKEN_MANAGER_ADDRESS environment variable");
  }

  // Validate the token address
  if (!ethers.isAddress(tokenManagerAddress)) {
    throw new Error(`Invalid TOKEN_MANAGER_ADDRESS: ${tokenManagerAddress}`);
  }

  // BSC Mainnet-specific gas configuration
  const gasLimit = 3000000; // Increased gas limit

  console.log("Network: BSC Mainnet");
  console.log("TokenManager Address:", tokenManagerAddress);

  // Deploy Oracle with explicit gas settings
  console.log("\nDeploying Oracle...");
  const OracleFactory = await ethers.getContractFactory("Oracle");
  
  let oracle, oracleAddress;
  try {
    oracle = await OracleFactory.deploy(deployer.address, {
      gasLimit: gasLimit
    });
    
    console.log("Oracle deployment transaction sent...");
    await oracle.waitForDeployment();
    
    oracleAddress = await oracle.getAddress();
    console.log("✅ Oracle deployed to:", oracleAddress);
  } catch (error) {
    console.error("❌ Oracle Deployment Failed:");
    console.error("Error Details:", error);
    throw error;
  }

  // Deploy Bridge with explicit gas settings
  console.log("\nDeploying Bridge...");
  const BridgeFactory = await ethers.getContractFactory("Bridge");
  const transferFee = 100; // 1% (100 basis points)
  const operationFee = ethers.parseEther("1"); // 1 MRLN
  
  let bridge, bridgeAddress;
  try {
    bridge = await BridgeFactory.deploy(
      tokenManagerAddress,
      transferFee,
      operationFee,
      oracleAddress,
      deployer.address, // offchain processor initially set to deployer
      {
        gasLimit: gasLimit
      }
    );
    
    console.log("Bridge deployment transaction sent...");
    await bridge.waitForDeployment();
    
    bridgeAddress = await bridge.getAddress();
    console.log("✅ Bridge deployed to:", bridgeAddress);
  } catch (error) {
    console.error("❌ Bridge Deployment Failed:");
    console.error("Error Details:", error);
    throw error;
  }

  // Set the bridge address in the Oracle
  console.log("\nSetting bridge address in Oracle...");
  try {
    const setBridgeTx = await oracle.setBridge(bridgeAddress, {
      gasLimit: 300000 // Lower gas limit for this transaction
    });
    await setBridgeTx.wait();
    console.log("✅ Bridge address set in Oracle");
  } catch (error) {
    console.error("❌ Failed to set bridge address in Oracle:");
    console.error("Error Details:", error);
    throw error;
  }

  console.log("\n=== BRIDGE DEPLOYMENT SUMMARY ===");
  console.log("TokenManager:", tokenManagerAddress);
  console.log("Oracle:", oracleAddress);
  console.log("Bridge:", bridgeAddress);

  // Wait for block confirmations before verification
  console.log("\nWaiting for confirmations...");
  await delay(60000); // 60 seconds

  // Verify contracts on block explorer
  if (Number(network.chainId) !== 31337) { // not hardhat or localhost
    console.log("Verifying contracts on BscScan...");
    try {
      await hre.run("verify:verify", {
        address: oracleAddress,
        constructorArguments: [deployer.address],
      });

      await hre.run("verify:verify", {
        address: bridgeAddress,
        constructorArguments: [
          tokenManagerAddress,
          transferFee,
          operationFee,
          oracleAddress,
          deployer.address
        ],
      });
      
      console.log("✅ Verification complete!");
    } catch (error) {
      console.error("❌ Verification error:", error);
    }
  }

  console.log("\n🎉 Bridge deployment complete!");
  console.log("Next steps:");
  console.log("1. Manually transfer tokens to bridge:", bridgeAddress);
  console.log("2. Set offchain processor using set-processor scripts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment Failed:", error);
    process.exit(1);
  }); 