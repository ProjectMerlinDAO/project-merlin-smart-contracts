import { ethers } from "hardhat";
import { getNetworkConfig } from "./config";
import { Network } from "@ethersproject/networks";

async function main() {
  const deployType = process.env.DEPLOY_TYPE || "bridge";
  const [deployer] = await ethers.getSigners();
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Generate a unique salt for this deployment
  const deploymentSalt = generateUniqueSalt(chainId);

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Deploying on network:", network.chainId.toString(), `(${network.name})`);
  console.log(`Deployment salt: ${deploymentSalt}`);
  
  const config = getNetworkConfig(network.name);
  console.log("Using configuration for:", config.name);
  
  if (deployType === "bridge") {
    await deployBridgeContracts(deployer, config, chainId, deploymentSalt);
  } else if (deployType === "dao") {
    await deployDAOContracts(deployer, config, chainId, deploymentSalt);
  }
}

// Generate a unique salt value that incorporates chainId and timestamp
function generateUniqueSalt(chainId: number): string {
  // Use fixed salt based on chain ID - will be unique across chains but consistent for same chain
  return `${chainId}-${Math.floor(Date.now() / 1000)}`;
}

// Function to generate unique deployment parameters based on chain ID and salt
function getUniqueDeploymentParams(config: any, chainId: number, salt: string) {
  return {
    tokenName: `${config.tokenName}-${chainId}`, // Keep chain ID in the name for clarity
    tokenSymbol: `${config.tokenSymbol}${salt.substring(salt.length - 4)}`, // Add short unique suffix
    totalSupply: config.totalSupply,
    bridgeAmount: config.bridgeAmount,
    transferFee: config.transferFee,
    operationFee: config.operationFee
  };
}

async function deployBridgeContracts(deployer: any, config: any, chainId: number, salt: string) {
  console.log("Deploying Bridge contracts...");
  console.log(`Using chain-specific deployment for chain ID: ${chainId}`);

  // Get unique parameters for this deployment
  const params = getUniqueDeploymentParams(config, chainId, salt);
  
  console.log(`Using token name: ${params.tokenName}`);
  console.log(`Using token symbol: ${params.tokenSymbol}`);

  // Deploy TokenManager
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy(
    params.tokenName,
    params.tokenSymbol,
    ethers.parseEther(params.totalSupply.toString()),
    ethers.parseEther(params.bridgeAmount.toString()),
    params.transferFee,
    ethers.parseEther(params.operationFee.toString())
  );
  await tokenManager.waitForDeployment();
  console.log("TokenManager deployed to:", await tokenManager.getAddress());

  // Get Bridge and Oracle addresses
  const bridge = await tokenManager.bridge();
  const oracle = await tokenManager.oracle();
  console.log("Bridge deployed to:", bridge);
  console.log("Oracle deployed to:", oracle);
}

async function deployDAOContracts(deployer: any, config: any, chainId: number, salt: string) {
  console.log("Deploying DAO contracts...");
  console.log(`Using chain-specific deployment for chain ID: ${chainId}`);
  
  // Get unique parameters for this deployment
  const params = getUniqueDeploymentParams(config, chainId, salt);
  
  console.log(`Using token name: ${params.tokenName}`);
  console.log(`Using token symbol: ${params.tokenSymbol}`);
  
  // Deploy TokenManager with minimal allocation
  console.log("Deploying TokenManager with minimal allocation...");
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy(
    params.tokenName,
    params.tokenSymbol,
    ethers.parseEther(params.totalSupply.toString()),
    ethers.parseEther(params.bridgeAmount.toString()),
    params.transferFee, 
    ethers.parseEther(params.operationFee.toString())
  );
  await tokenManager.waitForDeployment();
  console.log("TokenManager deployed to:", await tokenManager.getAddress());

  // Get Bridge and Oracle addresses
  const bridge = await tokenManager.bridge();
  const oracle = await tokenManager.oracle();
  console.log("Bridge deployed to:", bridge);
  console.log("Oracle deployed to:", oracle);

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
    await tokenManager.getAddress()
  );
  await projectDAO.waitForDeployment();
  console.log("ProjectDAO deployed to:", await projectDAO.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 