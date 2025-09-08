const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TokenPresale with the account:", deployer.address);
  
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (${network.chainId})`);

  // Check if we're on mainnet
  if (network.chainId !== 42161) {
    console.log("WARNING: This script is intended to be run on Arbitrum One (chainId: 42161)");
    console.log(`Current network: ${network.name} (${network.chainId})`);
    
    // Confirm before proceeding on non-mainnet
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise((resolve) => {
      readline.question(`You are NOT on Arbitrum One mainnet. Type 'confirm' to proceed anyway: `, (answer) => {
        if (answer.toLowerCase() !== 'confirm') {
          console.log("Deployment cancelled");
          process.exit(0);
        }
        readline.close();
        resolve();
      });
    });
  }

  // Confirm before proceeding on mainnet
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  await new Promise((resolve) => {
    readline.question(`You are about to deploy to MAINNET (${network.name}). Type 'confirm' to proceed: `, (answer) => {
      if (answer.toLowerCase() !== 'confirm') {
        console.log("Deployment cancelled");
        process.exit(0);
      }
      readline.close();
      resolve();
    });
  });

  try {
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

    // Get USDC and USDT addresses from environment variables
    const USDC_ADDRESS = process.env.USDC_MAINNET_ADDRESS;
    const USDT_ADDRESS = process.env.USDT_MAINNET_ADDRESS;

    // Validate addresses before proceeding
    console.log("Validating addresses...");
    console.log("Existing Token:", EXISTING_TOKEN_ADDRESS);
    console.log("USDC Address:", USDC_ADDRESS);
    console.log("USDT Address:", USDT_ADDRESS);

    if (!ethers.isAddress(EXISTING_TOKEN_ADDRESS)) {
      throw new Error(`Invalid token address: ${EXISTING_TOKEN_ADDRESS}`);
    }
    if (!ethers.isAddress(USDC_ADDRESS)) {
      throw new Error(`Invalid USDC address: ${USDC_ADDRESS}`);
    }
    if (!ethers.isAddress(USDT_ADDRESS)) {
      throw new Error(`Invalid USDT address: ${USDT_ADDRESS}`);
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
    console.log(`npx hardhat verify --network arbitrumOne ${tokenPresaleAddress} ${EXISTING_TOKEN_ADDRESS} ${USDC_ADDRESS} ${USDT_ADDRESS} ${TOKEN_PRICE} ${MIN_BUY_LIMIT} ${MAX_BUY_LIMIT} ${TOTAL_TOKENS_FOR_SALE}`);

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
      "deployment-presale-mainnet.json", 
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment information saved to deployment-presale-mainnet.json");
  } catch (error) {
    console.error("Deployment failed with error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });