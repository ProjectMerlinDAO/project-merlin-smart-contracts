import { ethers } from "hardhat";
import { delay } from "./utils";
import hre from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TOKEN ONLY contract with the account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log(`Deploying on network: ${network.chainId}`);
  
  // Token parameters (800M total supply held by deployer)
  const TOKEN_NAME = "Merlin Token";
  const TOKEN_SYMBOL = "MRLN";
  const TOTAL_SUPPLY = ethers.parseEther("800000000"); // 800M tokens

  console.log("Token Configuration:");
  console.log("- Name:", TOKEN_NAME);
  console.log("- Symbol:", TOKEN_SYMBOL);
  console.log("- Total Supply:", ethers.formatEther(TOTAL_SUPPLY), "tokens");
  console.log("- Strategy: Mint to deployer for manual distribution");

  // Deploy TokenManager (800M total supply)
  console.log("\nDeploying TokenManager (800M total supply)...");
  const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManagerFactory.deploy(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOTAL_SUPPLY // 800M tokens - will be minted to deployer
  );
  await tokenManager.waitForDeployment();
  const tokenManagerAddress = await tokenManager.getAddress();
  console.log("TokenManager deployed to:", tokenManagerAddress);

  // Keep tokens with deployer for manual distribution
  console.log("\nSkipping token burning to avoid deployment issues...");
  
  const deployerBalance = await tokenManager.balanceOf(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(deployerBalance));
  console.log("💡 All 800M tokens are held by deployer for manual distribution");

  // Verify token info
  console.log("\nVerifying token deployment...");
  const name = await tokenManager.name();
  const symbol = await tokenManager.symbol();
  const totalSupply = await tokenManager.totalSupply();
  const deployerBalanceAfter = await tokenManager.balanceOf(deployer.address);

  console.log("- Deployed Name:", name);
  console.log("- Deployed Symbol:", symbol);
  console.log("- Total Supply:", ethers.formatEther(totalSupply));
  console.log("- Deployer Balance:", ethers.formatEther(deployerBalanceAfter));

  console.log("\n=== TOKEN-ONLY DEPLOYMENT SUMMARY ===");
  console.log("TokenManager:", tokenManagerAddress);
  console.log("Network:", network.name, `(${network.chainId})`);
  console.log("Total Supply:", ethers.formatEther(totalSupply), "tokens");
  console.log("Deployer Balance:", ethers.formatEther(deployerBalanceAfter), "tokens");
  
  console.log("\n✅ SUCCESS: Token deployment completed!");
  console.log("💡 All 800M tokens are held by deployer for manual distribution");
  console.log("💡 Boss can use these tokens to fund bridges manually as needed");

  // Wait for block confirmations before verification
  console.log("\nWaiting for confirmations...");
  await delay(60000); // 60 seconds

  // Verify contracts on block explorer
  if (network.chainId !== 31337n) { // not hardhat or localhost
    console.log("Verifying contract on explorer...");
    try {
      await hre.run("verify:verify", {
        address: tokenManagerAddress,
        constructorArguments: [
          TOKEN_NAME,
          TOKEN_SYMBOL,
          TOTAL_SUPPLY
        ],
      });
      
      console.log("✅ Verification complete!");
    } catch (error) {
      console.error("❌ Verification error:", error);
    }
  }

  // Save deployment info for bridge deployment
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    tokenManager: tokenManagerAddress,
    tokenName: TOKEN_NAME,
    tokenSymbol: TOKEN_SYMBOL,
    totalSupply: ethers.formatEther(totalSupply),
    deployerBalance: ethers.formatEther(deployerBalanceAfter),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  const filename = `token-deployment-${network.name}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved to ${filename}`);

  console.log("\n🎉 Token deployment complete!");
  console.log("Next steps:");
  console.log("1. Set TOKEN_MANAGER_ADDRESS=" + tokenManagerAddress + " in your .env file");
  console.log("2. Deploy bridge using: npx hardhat run scripts/deploy-bridge-only.ts --network", network.name);
  console.log("3. Use deployer tokens to fund bridges manually as needed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 