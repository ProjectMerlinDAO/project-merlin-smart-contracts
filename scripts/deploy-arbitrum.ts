import { ethers } from "hardhat";
import { delay } from "./utils";
import hre from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy TokenManager first
  console.log("Deploying TokenManager...");
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy(
    "Merlin",                     // name
    "MRLN",                       // symbol
    ethers.parseEther("800000000"), // totalSupply
    ethers.parseEther("100000000"), // bridgeAmount
    100,                           // transferFee (1%)
    ethers.parseEther("1")         // operationFee (1 MRLN)
  );
  await tokenManager.waitForDeployment();
  console.log("TokenManager deployed to:", await tokenManager.getAddress());

  // Get Bridge and Oracle addresses
  const bridgeAddress = await tokenManager.bridge();
  const oracleAddress = await tokenManager.oracle();
  console.log("Bridge deployed to:", bridgeAddress);
  console.log("Oracle deployed to:", oracleAddress);

  // Deploy CommunityNFT
  console.log("Deploying CommunityNFT...");
  const CommunityNFT = await ethers.getContractFactory("CommunityNFT");
  const communityNFT = await CommunityNFT.deploy(await tokenManager.getAddress());
  await communityNFT.waitForDeployment();
  console.log("CommunityNFT deployed to:", await communityNFT.getAddress());

  // Deploy ProjectDAO
  console.log("Deploying ProjectDAO...");
  const ProjectDAO = await ethers.getContractFactory("ProjectDAO");
  const projectDAO = await ProjectDAO.deploy(
    await communityNFT.getAddress(),
    await tokenManager.getAddress(),
    deployer.address // offchain processor initially set to deployer
  );
  await projectDAO.waitForDeployment();
  console.log("ProjectDAO deployed to:", await projectDAO.getAddress());

  // Deploy ProjectInvestment if needed
  console.log("Deploying ProjectInvestment...");
  const ProjectInvestment = await ethers.getContractFactory("ProjectInvestment");
  const projectInvestment = await ProjectInvestment.deploy(
    await tokenManager.getAddress(),
    ethers.parseEther("1000") // targetAmount - 1000 MRLN
  );
  await projectInvestment.waitForDeployment();
  console.log("ProjectInvestment deployed to:", await projectInvestment.getAddress());

  // Wait for block confirmations before verification
  console.log("Waiting for confirmations...");
  await delay(60000); // 60 seconds

  // Verify contracts on Etherscan
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337n) { // not hardhat or localhost
    console.log("Verifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: await tokenManager.getAddress(),
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
        address: await communityNFT.getAddress(),
        constructorArguments: [await tokenManager.getAddress()],
      });
      
      await hre.run("verify:verify", {
        address: await projectDAO.getAddress(),
        constructorArguments: [
          await communityNFT.getAddress(),
          await tokenManager.getAddress(),
          deployer.address
        ],
      });
      
      await hre.run("verify:verify", {
        address: await projectInvestment.getAddress(),
        constructorArguments: [
          await tokenManager.getAddress(),
          ethers.parseEther("1000")
        ],
      });
      
      await hre.run("verify:verify", {
        address: bridgeAddress,
        constructorArguments: [
          await tokenManager.getAddress(),
          100,
          ethers.parseEther("1"),
          oracleAddress,
          deployer.address
        ],
      });
      
      await hre.run("verify:verify", {
        address: oracleAddress,
        constructorArguments: [deployer.address],
      });
    } catch (error) {
      console.error("Error verifying contracts:", error);
    }
  }

  console.log("Deployment complete!");
  console.log({
    TokenManager: await tokenManager.getAddress(),
    Bridge: bridgeAddress,
    Oracle: oracleAddress,
    CommunityNFT: await communityNFT.getAddress(),
    ProjectDAO: await projectDAO.getAddress(),
    ProjectInvestment: await projectInvestment.getAddress()
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 