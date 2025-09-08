const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TokenPresale with the account:", deployer.address);
  
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (${network.chainId})`);

  // Your existing token address - set this in your .env file
  const EXISTING_TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
  if (!EXISTING_TOKEN_ADDRESS || !ethers.isAddress(EXISTING_TOKEN_ADDRESS)) {
    throw new Error("Please set TOKEN_ADDRESS in your .env file with your deployed token address");
  }
  
  // Presale parameters
  const TOKEN_PRICE = ethers.parseUnits("0.04", 6); // $0.04 in USDC/USDT (6 decimals)
  const MIN_BUY_LIMIT = ethers.parseUnits("100", 6); // $100 minimum
  const MAX_BUY_LIMIT = ethers.parseUnits("10000", 6); // $10,000 maximum per user
  const TOTAL_TOKENS_FOR_SALE = ethers.parseEther("10000000"); // 10 million tokens for sale

  // Get USDC and USDT addresses from environment variables or use testnet addresses
  const USDC_ADDRESS = process.env.USDC_TESTNET_ADDRESS;
  const USDT_ADDRESS = process.env.USDT_TESTNET_ADDRESS;

  if (!USDC_ADDRESS || !ethers.isAddress(USDC_ADDRESS)) {
    throw new Error("Please set USDC_TESTNET_ADDRESS in your .env file");
  }
  if (!USDT_ADDRESS || !ethers.isAddress(USDT_ADDRESS)) {
    throw new Error("Please set USDT_TESTNET_ADDRESS in your .env file");
  }

  console.log("Deploying TokenPresale...");
  const TokenPresale = await ethers.getContractFactory("TokenPresale");
  const tokenPresale = await TokenPresale.deploy(
    EXISTING_TOKEN_ADDRESS,
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

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Existing Token: ${EXISTING_TOKEN_ADDRESS}`);
  console.log(`TokenPresale: ${tokenPresaleAddress}`);
  console.log(`USDC Address: ${USDC_ADDRESS}`);
  console.log(`USDT Address: ${USDT_ADDRESS}`);
  console.log(`Token Price: $${ethers.formatUnits(TOKEN_PRICE, 6)} USDC/USDT`);
  console.log(`Min Buy: $${ethers.formatUnits(MIN_BUY_LIMIT, 6)} USDC/USDT`);
  console.log(`Max Buy: $${ethers.formatUnits(MAX_BUY_LIMIT, 6)} USDC/USDT`);
  console.log(`Total Tokens for Sale: ${ethers.formatEther(TOTAL_TOKENS_FOR_SALE)} tokens`);
  console.log("\nTo verify the TokenPresale contract:");
  console.log(`npx hardhat verify --network arbitrumSepolia ${tokenPresaleAddress} ${EXISTING_TOKEN_ADDRESS} ${USDC_ADDRESS} ${USDT_ADDRESS} ${TOKEN_PRICE} ${MIN_BUY_LIMIT} ${MAX_BUY_LIMIT} ${TOTAL_TOKENS_FOR_SALE}`);

  console.log("\nNext steps:");
  console.log("1. Verify the contract using the command above");
  console.log("2. Fund the presale with tokens: await tokenPresale.addTokensToPresale(amount)");
  console.log("3. Activate the presale: await tokenPresale.setPresaleStatus(true)");
  console.log("4. Set unlock percentage when needed: await tokenPresale.setUnlockPercentage(percentage)");

  // Save deployment addresses to a file for easy access
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    existingToken: EXISTING_TOKEN_ADDRESS,
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
    "deployment-presale-testnet.json", 
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Deployment information saved to deployment-presale-testnet.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });