import { ethers } from "hardhat";
import { delay } from "./utils";
import hre from "hardhat";
import { getNetworkConfig } from "./deploy-config";
import { Network } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log(`Deploying on network: ${network.chainId} (${network.name || "unknown"})`);
  
  const config = getNetworkConfig(network.chainId);
  console.log(`Using configuration for: ${config.name}`);
  
  // Deploy all contracts
  await deployAllContracts(config, network);
}

async function deployAllContracts(config: any, network: Network) {
  console.log("Deploying all contracts (Bridge + DAO)...");
  
  // Deploy Oracle first
  console.log("Deploying Oracle...");
  const OracleFactory = await ethers.getContractFactory("Oracle");
  const oracle = await OracleFactory.deploy((await ethers.getSigners())[0].address);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("Oracle deployed to:", oracleAddress);

  // Deploy TokenManager with full bridge amount
  console.log("Deploying TokenManager...");
  const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManagerFactory.deploy(
    config.tokenName,
    config.tokenSymbol,
    ethers.parseEther(config.totalSupply),
    ethers.parseEther(config.bridgeAmount),
    config.transferFee,
    ethers.parseEther(config.operationFee)
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

  // Deploy DAO-specific contracts
  console.log("\nDeploying DAO contracts...");

  // Deploy CommunityNFT
  console.log("Deploying CommunityNFT...");
  const CommunityNFT = await ethers.getContractFactory("CommunityNFT");
  const communityNFT = await CommunityNFT.deploy(tokenManagerAddress);
  await communityNFT.waitForDeployment();
  const communityNFTAddress = await communityNFT.getAddress();
  console.log("CommunityNFT deployed to:", communityNFTAddress);

  // Deploy ProjectDAO
  console.log("Deploying ProjectDAO...");
  const ProjectDAO = await ethers.getContractFactory("ProjectDAO");
  const projectDAO = await ProjectDAO.deploy(
    communityNFTAddress,
    tokenManagerAddress,
    (await ethers.getSigners())[0].address // offchain processor initially set to deployer
  );
  await projectDAO.waitForDeployment();
  const projectDAOAddress = await projectDAO.getAddress();
  console.log("ProjectDAO deployed to:", projectDAOAddress);

  // Deploy ProjectInvestment
  console.log("Deploying ProjectInvestment...");
  const ProjectInvestment = await ethers.getContractFactory("ProjectInvestment");
  const projectInvestment = await ProjectInvestment.deploy(
    tokenManagerAddress,
    ethers.parseEther("1000") // targetAmount - 1000 MRLN
  );
  await projectInvestment.waitForDeployment();
  const projectInvestmentAddress = await projectInvestment.getAddress();
  console.log("ProjectInvestment deployed to:", projectInvestmentAddress);

  // Wait for block confirmations before verification
  console.log("\nWaiting for confirmations...");
  await delay(60000); // 60 seconds

  // Verify all contracts on explorer if not on development network
  if (!config.isProductionNetwork && network.chainId !== 31337n) {
    await verifyAllContracts(
      oracleAddress,
      tokenManagerAddress,
      bridgeAddress,
      communityNFTAddress,
      projectDAOAddress,
      projectInvestmentAddress,
      config
    );
  }

  console.log("\nAll contracts deployment complete!");
  console.log({
    // Bridge Contracts
    TokenManager: tokenManagerAddress,
    Bridge: bridgeAddress,
    Oracle: oracleAddress,
    // DAO Contracts
    CommunityNFT: communityNFTAddress,
    ProjectDAO: projectDAOAddress,
    ProjectInvestment: projectInvestmentAddress
  });
}

async function verifyAllContracts(
  oracleAddress: string,
  tokenManagerAddress: string,
  bridgeAddress: string,
  communityNFTAddress: string,
  projectDAOAddress: string,
  projectInvestmentAddress: string,
  config: any
) {
  console.log(`\nVerifying all contracts on ${config.explorerName}...`);
  try {
    // Verify Oracle
    await hre.run("verify:verify", {
      address: oracleAddress,
      constructorArguments: [(await ethers.getSigners())[0].address],
    });

    // Verify TokenManager
    await hre.run("verify:verify", {
      address: tokenManagerAddress,
      constructorArguments: [
        config.tokenName,
        config.tokenSymbol,
        ethers.parseEther(config.totalSupply),
        ethers.parseEther(config.bridgeAmount),
        config.transferFee,
        ethers.parseEther(config.operationFee)
      ],
    });
    
    // Verify Bridge
    await hre.run("verify:verify", {
      address: bridgeAddress,
      constructorArguments: [
        tokenManagerAddress,
        config.transferFee,
        ethers.parseEther(config.operationFee),
        oracleAddress,
        (await ethers.getSigners())[0].address
      ],
    });

    // Verify CommunityNFT
    await hre.run("verify:verify", {
      address: communityNFTAddress,
      constructorArguments: [tokenManagerAddress],
    });
    
    // Verify ProjectDAO
    await hre.run("verify:verify", {
      address: projectDAOAddress,
      constructorArguments: [
        communityNFTAddress,
        tokenManagerAddress,
        (await ethers.getSigners())[0].address
      ],
    });
    
    // Verify ProjectInvestment
    await hre.run("verify:verify", {
      address: projectInvestmentAddress,
      constructorArguments: [
        tokenManagerAddress,
        ethers.parseEther("1000")
      ],
    });
  } catch (error) {
    console.error("Error verifying contracts:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 