import { ethers, network } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TokenManager, ProjectInvestment } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy TokenManager
  const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManagerFactory.deploy(
    "Merlin",
    "MRLN",
    ethers.parseEther("800000000"), // Total supply
    ethers.parseEther("100000000"), // Bridge amount
    ethers.parseEther("0.1"),      // Transfer fee
    ethers.parseEther("0.05")      // Operation fee
  ) as TokenManager;
  await tokenManager.waitForDeployment();
  console.log("TokenManager deployed to:", await tokenManager.getAddress());

  // Deploy ProjectInvestment
  const ProjectInvestmentFactory = await ethers.getContractFactory("ProjectInvestment");
  const projectInvestment = await ProjectInvestmentFactory.deploy(
    await tokenManager.getAddress(),
    ethers.parseEther("1000") // Target amount: 1000 MRLN
  ) as ProjectInvestment;
  await projectInvestment.waitForDeployment();
  console.log("ProjectInvestment deployed to:", await projectInvestment.getAddress());

  // Verify contracts on Etherscan
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    
    await new Promise(resolve => setTimeout(resolve, 60000)); // wait 60 seconds

    const hre = require("hardhat") as HardhatRuntimeEnvironment;
    
    await hre.run("verify:verify", {
      address: await tokenManager.getAddress(),
      constructorArguments: [
        "Merlin",
        "MRLN",
        ethers.parseEther("800000000"),
        ethers.parseEther("100000000"),
        ethers.parseEther("0.1"),
        ethers.parseEther("0.05")
      ],
    });

    await hre.run("verify:verify", {
      address: await projectInvestment.getAddress(),
      constructorArguments: [
        await tokenManager.getAddress(),
        ethers.parseEther("1000")
      ],
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });