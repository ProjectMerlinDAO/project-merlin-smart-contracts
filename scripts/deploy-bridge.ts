import { ethers } from "hardhat";
import { delay } from "./utils";
import hre from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying bridge contracts with the account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log(`Deploying on network: ${network.chainId}`);
  
  // Deploy Oracle
  console.log("Deploying Oracle...");
  const OracleFactory = await ethers.getContractFactory("Oracle");
  const oracle = await OracleFactory.deploy(deployer.address);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("Oracle deployed to:", oracleAddress);

  // Deploy Token Manager
  console.log("Deploying TokenManager...");
  const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManagerFactory.deploy(
    "Merlin Token",               // name (matching presale deployment)
    "MRLN",                       // symbol
    ethers.parseEther("800000000"), // totalSupply
  );
  await tokenManager.waitForDeployment();
  const tokenManagerAddress = await tokenManager.getAddress();
  console.log("TokenManager deployed to:", tokenManagerAddress);

  // Deploy Bridge manually
  console.log("Deploying Bridge...");
  const BridgeFactory = await ethers.getContractFactory("Bridge");
  const transferFee = 100; // 1% (100 basis points)
  const operationFee = ethers.parseEther("1"); // 1 MRLN
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

  // Transfer tokens to bridge
  console.log("Transferring tokens to Bridge...");
  const bridgeAmount = ethers.parseEther("100000000"); // 100M tokens
  await tokenManager.transfer(bridgeAddress, bridgeAmount);
  console.log(`Transferred ${ethers.formatEther(bridgeAmount)} tokens to Bridge`);

  // Wait for block confirmations before verification
  console.log("Waiting for confirmations...");
  await delay(60000); // 60 seconds

  // Verify contracts on Etherscan
  if (network.chainId !== 31337n) { // not hardhat or localhost
    console.log("Verifying contracts on explorer...");
    try {
      await hre.run("verify:verify", {
        address: oracleAddress,
        constructorArguments: [deployer.address],
      });

      await hre.run("verify:verify", {
        address: tokenManagerAddress,
        constructorArguments: [
          "Merlin Token",
          "MRLN",
          ethers.parseEther("800000000")
        ],
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
    } catch (error) {
      console.error("Error verifying contracts:", error);
    }
  }

  console.log("Deployment complete!");
  console.log({
    TokenManager: tokenManagerAddress,
    Bridge: bridgeAddress,
    Oracle: oracleAddress
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 