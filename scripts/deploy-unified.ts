import { ethers } from "hardhat";
import { getNetworkConfig } from "./config";
import { Network } from "@ethersproject/networks";

async function main() {
  const deployType = process.env.DEPLOY_TYPE || "bridge";
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Deploying on network:", network.chainId.toString(), `(${network.name})`);

  const config = getNetworkConfig(network.name);
  console.log("Using configuration for:", config.name);

  if (deployType === "bridge") {
    await deployBridgeContracts(deployer, config);
  } else if (deployType === "dao") {
    await deployDAOContracts(deployer, config);
  }
}

async function deployBridgeContracts(deployer: any, config: any) {
  console.log("Deploying Bridge contracts...");

  // Deploy TokenManager
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy(
    config.tokenName,
    config.tokenSymbol,
    ethers.parseEther(config.totalSupply.toString()),
    ethers.parseEther(config.bridgeAmount.toString()),
    config.transferFee,
    ethers.parseEther(config.operationFee.toString())
  );
  await tokenManager.waitForDeployment();
  console.log("TokenManager deployed to:", await tokenManager.getAddress());

  // Get Bridge and Oracle addresses
  const bridge = await tokenManager.bridge();
  const oracle = await tokenManager.oracle();
  console.log("Bridge deployed to:", bridge);
  console.log("Oracle deployed to:", oracle);
}

async function deployDAOContracts(deployer: any, config: any) {
  console.log("Deploying DAO contracts...");

  // Deploy TokenManager with minimal allocation
  console.log("Deploying TokenManager with minimal allocation...");
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy(
    config.tokenName,
    config.tokenSymbol,
    ethers.parseEther(config.totalSupply.toString()),
    ethers.parseEther(config.bridgeAmount.toString()),
    config.transferFee,
    ethers.parseEther(config.operationFee.toString())
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