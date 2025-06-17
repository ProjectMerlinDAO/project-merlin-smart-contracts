import { ethers } from "hardhat";

async function main() {
  console.log("Deploying TokenPresale contract...");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Contract parameters - REPLACE THESE WITH YOUR ACTUAL VALUES
  const TOKEN_ADDRESS = "0x1234567890123456789012345678901234567890"; // Replace with your token
  const USDC_ADDRESS = "0xA0b86a33E6441e4f5FD82c9F46b3a06A8E74cc6f"; // Replace with USDC address
  const TOKEN_PRICE = ethers.parseUnits("0.1", 6); // 0.1 USDC per token
  const MAX_BUY_LIMIT = ethers.parseUnits("10000", 18); // 10,000 tokens max per user

  console.log("Parameters:");
  console.log("- Token:", TOKEN_ADDRESS);
  console.log("- USDC:", USDC_ADDRESS);
  console.log("- Price:", ethers.formatUnits(TOKEN_PRICE, 6), "USDC per token");
  console.log("- Max Buy Limit:", ethers.formatUnits(MAX_BUY_LIMIT, 18), "tokens");

  // Deploy
  const TokenPresale = await ethers.getContractFactory("TokenPresale");
  const presale = await TokenPresale.deploy(
    TOKEN_ADDRESS,
    USDC_ADDRESS,
    TOKEN_PRICE,
    MAX_BUY_LIMIT
  );

  await presale.waitForDeployment();
  console.log("TokenPresale deployed to:", await presale.getAddress());

  console.log("\n=== Next Steps ===");
  console.log("1. Fund contract with tokens: addTokensToPresale()");
  console.log("2. Activate presale: setPresaleStatus(true)");
  console.log("3. Set unlock percentage: setUnlockPercentage()");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 