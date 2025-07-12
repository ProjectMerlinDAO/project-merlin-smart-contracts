import { ethers } from "hardhat";
import { delay } from "./utils";
import hre from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting bridge and oracle with the account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (${network.chainId})`);
  
  // Get addresses from environment variables
  const tokenManagerAddress = process.env.TOKEN_MANAGER_ADDRESS;
  const bridgeAddress = process.env.BRIDGE_ADDRESS;
  const oracleAddress = process.env.ORACLE_ADDRESS;

  if (!tokenManagerAddress) {
    console.error("Please provide TOKEN_MANAGER_ADDRESS environment variable");
    process.exit(1);
  }

  if (!bridgeAddress) {
    console.error("Please provide BRIDGE_ADDRESS environment variable");
    process.exit(1);
  }

  if (!oracleAddress) {
    console.error("Please provide ORACLE_ADDRESS environment variable");
    process.exit(1);
  }

  console.log("Configuration:");
  console.log("- TokenManager:", tokenManagerAddress);
  console.log("- Bridge:", bridgeAddress);
  console.log("- Oracle:", oracleAddress);

  // Connect to TokenManager contract
  console.log("\nConnecting to TokenManager...");
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = TokenManager.attach(tokenManagerAddress) as any;

  // Check if bridge and oracle are already set
  console.log("\nChecking current bridge and oracle addresses...");
  const currentBridge = await tokenManager.bridge();
  const currentOracle = await tokenManager.oracle();
  
  console.log("Current bridge:", currentBridge);
  console.log("Current oracle:", currentOracle);

  if (currentBridge !== "0x0000000000000000000000000000000000000000") {
    console.log("❌ Bridge is already set!");
    console.log("Cannot set bridge and oracle - they can only be set once");
    process.exit(1);
  }

  if (currentOracle !== "0x0000000000000000000000000000000000000000") {
    console.log("❌ Oracle is already set!");
    console.log("Cannot set bridge and oracle - they can only be set once");
    process.exit(1);
  }

  // Set bridge and oracle
  console.log("\nSetting bridge and oracle addresses...");
  const tx = await tokenManager.setBridgeAndOracle(bridgeAddress, oracleAddress);
  console.log("Transaction hash:", tx.hash);
  
  console.log("Waiting for confirmation...");
  await tx.wait();
  console.log("✅ Bridge and oracle addresses set successfully!");

  // Verify the setting
  console.log("\nVerifying the setting...");
  const newBridge = await tokenManager.bridge();
  const newOracle = await tokenManager.oracle();
  
  console.log("New bridge:", newBridge);
  console.log("New oracle:", newOracle);

  if (newBridge === bridgeAddress && newOracle === oracleAddress) {
    console.log("✅ Verification successful!");
  } else {
    console.log("❌ Verification failed!");
    process.exit(1);
  }

  console.log("\n=== BRIDGE AND ORACLE SETTING SUMMARY ===");
  console.log("TokenManager:", tokenManagerAddress);
  console.log("Bridge:", newBridge);
  console.log("Oracle:", newOracle);
  console.log("Network:", network.name, `(${network.chainId})`);
  console.log("Transaction:", tx.hash);

  console.log("\n🎉 Bridge and oracle connection complete!");
  console.log("TokenManager is now connected to Bridge and Oracle contracts.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 