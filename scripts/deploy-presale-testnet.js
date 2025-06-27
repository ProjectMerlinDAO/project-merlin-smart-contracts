const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (${network.chainId})`);

  // Token parameters
  const TOKEN_NAME = "Merlin Token";
  const TOKEN_SYMBOL = "MRLN";
  const TOTAL_SUPPLY = ethers.parseEther("800000000"); // 800 million tokens
  
  // Presale parameters
  const TOKEN_PRICE = ethers.parseUnits("0.04", 6); // $0.04 in USDC/USDT (6 decimals)
  const MIN_BUY_LIMIT = ethers.parseUnits("100", 6); // $100 minimum
  const MAX_BUY_LIMIT = ethers.parseUnits("10000", 6); // $10,000 maximum per user
  const TOTAL_TOKENS_FOR_SALE = ethers.parseEther("10000000"); // 10 million tokens for sale

  // Get USDC and USDT addresses from environment variables or use testnet addresses
  const USDC_ADDRESS = process.env.USDC_TESTNET_ADDRESS; // Default Arbitrum Sepolia USDC
  const USDT_ADDRESS = process.env.USDT_TESTNET_ADDRESS; // Default Arbitrum Sepolia USDT

  console.log("Deploying TokenManager...");
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOTAL_SUPPLY
  );
  await tokenManager.waitForDeployment();
  const tokenManagerAddress = await tokenManager.getAddress();
  console.log("TokenManager deployed to:", tokenManagerAddress);

  console.log("Deploying TokenPresale...");
  const TokenPresale = await ethers.getContractFactory("TokenPresale");
  const tokenPresale = await TokenPresale.deploy(
    tokenManagerAddress,
    USDC_ADDRESS,
    USDT_ADDRESS,
    TOKEN_PRICE,
    MIN_BUY_LIMIT,
    MAX_BUY_LIMIT,
    TOTAL_TOKENS_FOR_SALE
  );
  await tokenPresale.waitForDeployment();
  const tokenPresaleAddress = await tokenPresale.getAddress();
  console.log("TokenPresale deployed to:", tokenPresaleAddress);

  // Fund the presale contract with tokens
  console.log("Funding TokenPresale contract with tokens...");
  await tokenManager.approve(tokenPresaleAddress, TOTAL_TOKENS_FOR_SALE);
  await tokenPresale.addTokensToPresale(TOTAL_TOKENS_FOR_SALE);
  console.log(`Successfully funded TokenPresale with ${ethers.formatEther(TOTAL_TOKENS_FOR_SALE)} MRLN tokens`);

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`TokenManager: ${tokenManagerAddress}`);
  console.log(`TokenPresale: ${tokenPresaleAddress}`);
  console.log(`USDC Address: ${USDC_ADDRESS}`);
  console.log(`USDT Address: ${USDT_ADDRESS}`);
  console.log(`Token Price: $${ethers.formatUnits(TOKEN_PRICE, 6)} USDC/USDT`);
  console.log(`Min Buy: $${ethers.formatUnits(MIN_BUY_LIMIT, 6)} USDC/USDT`);
  console.log(`Max Buy: $${ethers.formatUnits(MAX_BUY_LIMIT, 6)} USDC/USDT`);
  console.log(`Total Tokens for Sale: ${ethers.formatEther(TOTAL_TOKENS_FOR_SALE)} MRLN`);
  console.log("\nTo verify contracts:");
  console.log(`npx hardhat verify --network arbitrumSepolia ${tokenManagerAddress} "${TOKEN_NAME}" "${TOKEN_SYMBOL}" ${TOTAL_SUPPLY}`);
  console.log(`npx hardhat verify --network arbitrumSepolia ${tokenPresaleAddress} ${tokenManagerAddress} ${USDC_ADDRESS} ${USDT_ADDRESS} ${TOKEN_PRICE} ${MIN_BUY_LIMIT} ${MAX_BUY_LIMIT} ${TOTAL_TOKENS_FOR_SALE}`);

  // Save deployment addresses to a file for easy access
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    tokenManager: tokenManagerAddress,
    tokenPresale: tokenPresaleAddress,
    usdc: USDC_ADDRESS,
    usdt: USDT_ADDRESS,
    tokenPrice: ethers.formatUnits(TOKEN_PRICE, 6),
    minBuy: ethers.formatUnits(MIN_BUY_LIMIT, 6),
    maxBuy: ethers.formatUnits(MAX_BUY_LIMIT, 6),
    tokensForSale: ethers.formatEther(TOTAL_TOKENS_FOR_SALE),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    "deployment-arbitrum-sepolia.json", 
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Deployment information saved to deployment-arbitrum-sepolia.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 