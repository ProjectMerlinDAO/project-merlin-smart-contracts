import { ethers } from "hardhat";
import { delay } from "./utils";
import hre from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying bridge contracts with the account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log(`Deploying on network: ${network.chainId}`);
  
  // Get TokenManager address from command line arguments
  const tokenManagerAddress = process.env.TOKEN_MANAGER_ADDRESS;
  if (!tokenManagerAddress) {
    console.error("Please provide TOKEN_MANAGER_ADDRESS environment variable");
    process.exit(1);
  }
  console.log("Using TokenManager at:", tokenManagerAddress);
  
  // Connect to existing TokenManager
  const tokenManager = await ethers.getContractAt("TokenManager", tokenManagerAddress);
  console.log("Connected to TokenManager with name:", await tokenManager.name());
  
  // Deploy Oracle
  console.log("Deploying Oracle...");
  const OracleFactory = await ethers.getContractFactory("Oracle");
  const oracle = await OracleFactory.deploy(deployer.address);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("Oracle deployed to:", oracleAddress);

  // Define bridge parameters
  const transferFee = 100; // 1% (100 basis points)
  const operationFee = ethers.parseEther("1"); // 1 MRLN
  const bridgeAmount = ethers.parseEther("100000000"); // 100M tokens for bridge
  
  // Deploy Bridge
  console.log("Deploying Bridge...");
  const BridgeFactory = await ethers.getContractFactory("Bridge");
  const bridge = await BridgeFactory.deploy(
    tokenManagerAddress,
    transferFee,
    operationFee,
    oracleAddress,
    deployer.address // offchain processor initially set to deployer
  );
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("Bridge deployed to:", bridgeAddress);

  // Set the bridge address in the Oracle
  console.log("Setting bridge address in Oracle...");
  await oracle.setBridge(bridgeAddress);
  console.log("Bridge address set in Oracle");
  
  // Set bridge and oracle in TokenManager
  console.log("Setting Bridge and Oracle in TokenManager...");
  await tokenManager.setBridgeAndOracle(bridgeAddress, oracleAddress);
  console.log("Bridge and Oracle set in TokenManager");
  
  // Transfer tokens to the Bridge
  console.log("Transferring tokens to Bridge...");
  await tokenManager.transfer(bridgeAddress, bridgeAmount);
  console.log(`Transferred ${ethers.formatEther(bridgeAmount)} tokens to Bridge`);

  // Wait for block confirmations before verification
  console.log("Waiting for confirmations...");
  await delay(60000);

  // Verify contracts on Etherscan
  if (network.chainId !== 31337 && network.chainId !== 1337) {
    try {
      console.log("Verifying Oracle contract...");
      await hre.run("verify:verify", {
        address: oracleAddress,
        constructorArguments: [deployer.address],
      });

      console.log("Verifying Bridge contract...");
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
      
      console.log("Verification complete!");
    } catch (error) {
      console.error("Verification error:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 