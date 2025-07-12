import { ethers } from "hardhat";
import { getNetworkConfig } from "./config";
import { Network } from "@ethersproject/networks";
import hre from "hardhat";

// Utility function to wait
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

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

  // Deploy Oracle first
  console.log("Deploying Oracle...");
  const OracleFactory = await ethers.getContractFactory("Oracle");
  const oracle = await OracleFactory.deploy(deployer.address);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("Oracle deployed to:", oracleAddress);

  // Deploy TokenManager (3 parameter version)
  console.log("Deploying TokenManager...");
  const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManagerFactory.deploy(
    params.tokenName,
    params.tokenSymbol,
    ethers.parseEther(params.totalSupply.toString())
  );
  await tokenManager.waitForDeployment();
  const tokenManagerAddress = await tokenManager.getAddress();
  console.log("TokenManager deployed to:", tokenManagerAddress);

  // Deploy Bridge manually
  console.log("Deploying Bridge...");
  const BridgeFactory = await ethers.getContractFactory("Bridge");
  const bridge = await BridgeFactory.deploy(
    tokenManagerAddress,
    params.transferFee,
    ethers.parseEther(params.operationFee.toString()),
    oracleAddress,
    deployer.address
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
  const bridgeAmount = ethers.parseEther(params.bridgeAmount.toString());
  await tokenManager.transfer(bridgeAddress, bridgeAmount);
  console.log(`Transferred ${ethers.formatEther(bridgeAmount)} tokens to Bridge`);

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("TokenManager:", tokenManagerAddress);
  console.log("Bridge:", bridgeAddress);
  console.log("Oracle:", oracleAddress);
  console.log("Bridge Amount:", ethers.formatEther(bridgeAmount), "tokens");

  // Wait for block confirmations before verification
  console.log("\n⏳ Waiting for block confirmations before verification...");
  await delay(30000); // Wait 30 seconds

  // Verify contracts
  await verifyBridgeContracts(
    oracleAddress,
    tokenManagerAddress,
    bridgeAddress,
    params,
    deployer.address,
    chainId
  );
}

async function deployDAOContracts(deployer: any, config: any, chainId: number, salt: string) {
  console.log("Deploying DAO contracts...");
  console.log(`Using chain-specific deployment for chain ID: ${chainId}`);
  
  // Get unique parameters for this deployment
  const params = getUniqueDeploymentParams(config, chainId, salt);
  
  console.log(`Using token name: ${params.tokenName}`);
  console.log(`Using token symbol: ${params.tokenSymbol}`);
  
  // Deploy Oracle first
  console.log("Deploying Oracle...");
  const OracleFactory = await ethers.getContractFactory("Oracle");
  const oracle = await OracleFactory.deploy(deployer.address);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("Oracle deployed to:", oracleAddress);

  // Deploy TokenManager with minimal allocation
  console.log("Deploying TokenManager with minimal allocation...");
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy(
    params.tokenName,
    params.tokenSymbol,
    ethers.parseEther(params.totalSupply.toString())
  );
  await tokenManager.waitForDeployment();
  const tokenManagerAddress = await tokenManager.getAddress();
  console.log("TokenManager deployed to:", tokenManagerAddress);

  // Deploy Bridge
  console.log("Deploying Bridge...");
  const BridgeFactory = await ethers.getContractFactory("Bridge");
  const bridge = await BridgeFactory.deploy(
    tokenManagerAddress,
    params.transferFee,
    ethers.parseEther(params.operationFee.toString()),
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
    deployer.address // offchain processor initially set to deployer
  );
  await projectDAO.waitForDeployment();
  const projectDAOAddress = await projectDAO.getAddress();
  console.log("ProjectDAO deployed to:", projectDAOAddress);

  console.log("\n=== DAO DEPLOYMENT SUMMARY ===");
  console.log("TokenManager:", tokenManagerAddress);
  console.log("Bridge:", bridgeAddress);
  console.log("Oracle:", oracleAddress);
  console.log("CommunityNFT:", communityNFTAddress);
  console.log("ProjectDAO:", projectDAOAddress);

  // Wait for block confirmations before verification
  console.log("\n⏳ Waiting for block confirmations before verification...");
  await delay(30000); // Wait 30 seconds

  // Verify DAO contracts
  await verifyDAOContracts(
    oracleAddress,
    tokenManagerAddress,
    bridgeAddress,
    communityNFTAddress,
    projectDAOAddress,
    params,
    deployer.address,
    chainId
  );
}

// Contract verification functions
async function verifyBridgeContracts(
  oracleAddress: string,
  tokenManagerAddress: string,
  bridgeAddress: string,
  params: any,
  deployerAddress: string,
  chainId: number
) {
  console.log("\n🔍 Verifying Bridge contracts on block explorer...");
  
  if (chainId === 31337 || chainId === 1337) {
    console.log("⚠️ Skipping verification on local network");
    return;
  }

  try {
    // Verify Oracle
    console.log("Verifying Oracle...");
    await hre.run("verify:verify", {
      address: oracleAddress,
      constructorArguments: [deployerAddress],
    });
    console.log("✅ Oracle verified");

    // Verify TokenManager
    console.log("Verifying TokenManager...");
    await hre.run("verify:verify", {
      address: tokenManagerAddress,
      constructorArguments: [
        params.tokenName,
        params.tokenSymbol,
        ethers.parseEther(params.totalSupply.toString())
      ],
    });
    console.log("✅ TokenManager verified");

    // Verify Bridge
    console.log("Verifying Bridge...");
    await hre.run("verify:verify", {
      address: bridgeAddress,
      constructorArguments: [
        tokenManagerAddress,
        params.transferFee,
        ethers.parseEther(params.operationFee.toString()),
        oracleAddress,
        deployerAddress
      ],
    });
    console.log("✅ Bridge verified");

    console.log("🎉 All Bridge contracts verified successfully!");
  } catch (error) {
    console.error("❌ Error during verification:", error);
    console.log("💡 You can verify manually later using the addresses and constructor arguments");
  }
}

async function verifyDAOContracts(
  oracleAddress: string,
  tokenManagerAddress: string,
  bridgeAddress: string,
  communityNFTAddress: string,
  projectDAOAddress: string,
  params: any,
  deployerAddress: string,
  chainId: number
) {
  console.log("\n🔍 Verifying DAO contracts on block explorer...");
  
  if (chainId === 31337 || chainId === 1337) {
    console.log("⚠️ Skipping verification on local network");
    return;
  }

  try {
    // First verify bridge contracts
    await verifyBridgeContracts(oracleAddress, tokenManagerAddress, bridgeAddress, params, deployerAddress, chainId);

    // Verify CommunityNFT
    console.log("Verifying CommunityNFT...");
    await hre.run("verify:verify", {
      address: communityNFTAddress,
      constructorArguments: [tokenManagerAddress],
    });
    console.log("✅ CommunityNFT verified");

    // Verify ProjectDAO
    console.log("Verifying ProjectDAO...");
    await hre.run("verify:verify", {
      address: projectDAOAddress,
      constructorArguments: [
        communityNFTAddress,
        tokenManagerAddress,
        deployerAddress
      ],
    });
    console.log("✅ ProjectDAO verified");

    console.log("🎉 All DAO contracts verified successfully!");
  } catch (error) {
    console.error("❌ Error during verification:", error);
    console.log("💡 You can verify manually later using the addresses and constructor arguments");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 