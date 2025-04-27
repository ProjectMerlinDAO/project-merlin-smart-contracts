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
    "Merlin",                     // name
    "MRLN",                       // symbol
    ethers.parseEther("800000000"), // totalSupply
    ethers.parseEther("100000000"), // bridgeAmount
    100,                           // transferFee (1%)
    ethers.parseEther("1")         // operationFee (1 MRLN)
  );
  await tokenManager.waitForDeployment();
  const tokenManagerAddress = await tokenManager.getAddress();
  console.log("TokenManager deployed to:", tokenManagerAddress);

  // Get Bridge address
  const bridgeAddress = await tokenManager.bridge();
  console.log("Bridge deployed to:", bridgeAddress);

  // Set the bridge address in the Oracle
  console.log("Setting bridge address in Oracle...");
  await oracle.setBridge(bridgeAddress);
  console.log("Bridge address set in Oracle");

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
          "Merlin",
          "MRLN",
          ethers.parseEther("800000000"),
          ethers.parseEther("100000000"),
          100,
          ethers.parseEther("1")
        ],
      });
      
      await hre.run("verify:verify", {
        address: bridgeAddress,
        constructorArguments: [
          tokenManagerAddress,
          100,
          ethers.parseEther("1"),
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