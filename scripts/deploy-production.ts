import { ethers } from "hardhat";
import { delay } from "./utils";
import hre from "hardhat";

// =============================================================================
// PRODUCTION DEPLOYMENT CONFIGURATION
// =============================================================================

// Network-specific token addresses
const NETWORK_TOKENS = {
  // Arbitrum Mainnet (Chain ID: 42161)
  42161: {
    name: "Arbitrum One",
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Native USDC
    usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // Tether USD
  },
  // Arbitrum Sepolia Testnet (Chain ID: 421614)
  421614: {
    name: "Arbitrum Sepolia",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC on Sepolia
    usdt: "0x6650Cf6Fc2b3E1D3d21Beca7de6c6fa2eDbAeB98", // Mock USDT (you may need to deploy)
  }
};

// Token Configuration
const TOKEN_CONFIG = {
  name: "Merlin",
  symbol: "MRLN",
  totalSupply: "800000000", // 800M tokens
  bridgeAmount: "100000000", // 100M tokens for bridge
  transferFee: 100, // 1% (100 basis points)
  operationFee: "1" // 1 MRLN token
};

// Presale Configuration (CEO can modify these values)
const PRESALE_CONFIG = {
  tokenPrice: "40000", // 0.04 USDC per token (40000 = 0.04 * 10^6 USDC decimals)
  minBuyLimit: "100000000", // $100 minimum purchase (100 * 10^6 USDC decimals)
  maxBuyLimit: "500000000", // $500 maximum purchase per user (500 * 10^6 USDC decimals)
  totalTokensForSale: "50000000" // 50M tokens for presale (CEO CONFIGURE THIS)
};

// =============================================================================
// DEPLOYMENT SCRIPT
// =============================================================================

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=".repeat(80));
  console.log("🚀 PRODUCTION DEPLOYMENT SCRIPT - PROJECT MERLIN");
  console.log("=".repeat(80));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Verify network and get token addresses
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log("Network:", network.name, "Chain ID:", chainId);
  
  // Get network-specific token addresses
  const networkTokens = NETWORK_TOKENS[chainId as keyof typeof NETWORK_TOKENS];
  if (!networkTokens) {
    throw new Error(`Unsupported network. Chain ID: ${chainId}. Supported networks: Arbitrum One (42161), Arbitrum Sepolia (421614)`);
  }
  
  console.log("Network detected:", networkTokens.name);
  console.log("USDC address:", networkTokens.usdc);
  console.log("USDT address:", networkTokens.usdt);
  
  if (chainId === 421614) {
    console.warn("🧪 TESTNET DEPLOYMENT - Arbitrum Sepolia");
    console.log("This is a test deployment. For mainnet deployment, use --network arbitrumOne");
  } else if (chainId === 42161) {
    console.warn("🚨 MAINNET DEPLOYMENT - Arbitrum One");
    console.log("This is a REAL deployment with REAL tokens and REAL money!");
  }

  console.log("\n" + "=".repeat(50));
  console.log("📋 DEPLOYMENT CONFIGURATION");
  console.log("=".repeat(50));
  console.log("Token Name:", TOKEN_CONFIG.name);
  console.log("Token Symbol:", TOKEN_CONFIG.symbol);
  console.log("Total Supply:", TOKEN_CONFIG.totalSupply, "tokens");
  console.log("Bridge Amount:", TOKEN_CONFIG.bridgeAmount, "tokens");
  console.log("Presale Tokens:", PRESALE_CONFIG.totalTokensForSale, "tokens");
  console.log("Token Price:", Number(PRESALE_CONFIG.tokenPrice) / 1000000, "USDC per token");
  console.log("Min Purchase:", Number(PRESALE_CONFIG.minBuyLimit) / 1000000, "USDC");
  console.log("Max Purchase:", Number(PRESALE_CONFIG.maxBuyLimit) / 1000000, "USDC");
  console.log("");

  // =============================================================================
  // STEP 1: Deploy TokenManager (ERC20 Token + Bridge + Oracle)
  // =============================================================================
  
  console.log("🔥 STEP 1: Deploying TokenManager...");
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy(
    TOKEN_CONFIG.name,
    TOKEN_CONFIG.symbol,
    ethers.parseEther(TOKEN_CONFIG.totalSupply),
    ethers.parseEther(TOKEN_CONFIG.bridgeAmount),
    TOKEN_CONFIG.transferFee,
    ethers.parseEther(TOKEN_CONFIG.operationFee)
  );
  
  await tokenManager.waitForDeployment();
  const tokenManagerAddress = await tokenManager.getAddress();
  console.log("✅ TokenManager deployed to:", tokenManagerAddress);

  // Get deployed Bridge and Oracle addresses
  const bridgeAddress = await tokenManager.bridge();
  const oracleAddress = await tokenManager.oracle();
  console.log("🌉 Bridge deployed to:", bridgeAddress);
  console.log("🔮 Oracle deployed to:", oracleAddress);

  // Check CEO's token balance
  const ceoBalance = await tokenManager.balanceOf(deployer.address);
  console.log("💰 CEO token balance:", ethers.formatEther(ceoBalance), "MRLN");

  // =============================================================================
  // STEP 2: Deploy TokenPresale
  // =============================================================================

  console.log("\n🎯 STEP 2: Deploying TokenPresale...");
  const TokenPresale = await ethers.getContractFactory("TokenPresale");
  const tokenPresale = await TokenPresale.deploy(
    tokenManagerAddress, // token address
    networkTokens.usdc, // USDC address
    networkTokens.usdt, // USDT address
    PRESALE_CONFIG.tokenPrice,
    PRESALE_CONFIG.minBuyLimit,
    PRESALE_CONFIG.maxBuyLimit,
    ethers.parseEther(PRESALE_CONFIG.totalTokensForSale)
  );

  await tokenPresale.waitForDeployment();
  const tokenPresaleAddress = await tokenPresale.getAddress();
  console.log("✅ TokenPresale deployed to:", tokenPresaleAddress);

  // =============================================================================
  // STEP 3: Transfer tokens to presale contract
  // =============================================================================

  console.log("\n💸 STEP 3: Transferring tokens to presale contract...");
  const transferAmount = ethers.parseEther(PRESALE_CONFIG.totalTokensForSale);
  
  console.log("Approving presale contract to spend tokens...");
  const approveTx = await tokenManager.approve(tokenPresaleAddress, transferAmount);
  await approveTx.wait();
  console.log("✅ Approval confirmed");

  console.log("Transferring", PRESALE_CONFIG.totalTokensForSale, "MRLN to presale contract...");
  const transferTx = await tokenManager.transfer(tokenPresaleAddress, transferAmount);
  await transferTx.wait();
  console.log("✅ Transfer confirmed");

  // Verify presale contract balance
  const presaleBalance = await tokenManager.balanceOf(tokenPresaleAddress);
  console.log("💰 Presale contract balance:", ethers.formatEther(presaleBalance), "MRLN");

  // =============================================================================
  // STEP 4: Deployment Summary
  // =============================================================================

  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(80));
  
  const deploymentSummary = {
    "TokenManager (MRLN Token)": tokenManagerAddress,
    "Bridge Contract": bridgeAddress,
    "Oracle Contract": oracleAddress,
    "TokenPresale Contract": tokenPresaleAddress,
    "USDC Address": networkTokens.usdc,
    "USDT Address": networkTokens.usdt
  };

  console.table(deploymentSummary);

  console.log("\n📊 TOKEN DISTRIBUTION:");
  console.log("- Total Supply:", TOKEN_CONFIG.totalSupply, "MRLN");
  console.log("- Bridge Allocation:", TOKEN_CONFIG.bridgeAmount, "MRLN");
  console.log("- Presale Allocation:", PRESALE_CONFIG.totalTokensForSale, "MRLN");
  console.log("- CEO Wallet Balance:", ethers.formatEther(await tokenManager.balanceOf(deployer.address)), "MRLN");

  // =============================================================================
  // STEP 5: Contract Verification
  // =============================================================================

  console.log("\n🔍 STEP 5: Verifying contracts on Arbiscan...");
  await delay(30000); // Wait 30 seconds for block confirmations

  try {
    // Verify TokenManager
    console.log("Verifying TokenManager...");
    await hre.run("verify:verify", {
      address: tokenManagerAddress,
      constructorArguments: [
        TOKEN_CONFIG.name,
        TOKEN_CONFIG.symbol,
        ethers.parseEther(TOKEN_CONFIG.totalSupply),
        ethers.parseEther(TOKEN_CONFIG.bridgeAmount),
        TOKEN_CONFIG.transferFee,
        ethers.parseEther(TOKEN_CONFIG.operationFee)
      ],
    });

    // Verify TokenPresale
    console.log("Verifying TokenPresale...");
    await hre.run("verify:verify", {
      address: tokenPresaleAddress,
      constructorArguments: [
        tokenManagerAddress,
        networkTokens.usdc,
        networkTokens.usdt,
        PRESALE_CONFIG.tokenPrice,
        PRESALE_CONFIG.minBuyLimit,
        PRESALE_CONFIG.maxBuyLimit,
        ethers.parseEther(PRESALE_CONFIG.totalTokensForSale)
      ],
    });

    // Verify Bridge
    console.log("Verifying Bridge...");
    await hre.run("verify:verify", {
      address: bridgeAddress,
      constructorArguments: [
        tokenManagerAddress,
        TOKEN_CONFIG.transferFee,
        ethers.parseEther(TOKEN_CONFIG.operationFee),
        oracleAddress,
        deployer.address
      ],
    });

    // Verify Oracle
    console.log("Verifying Oracle...");
    await hre.run("verify:verify", {
      address: oracleAddress,
      constructorArguments: [deployer.address],
    });

    console.log("✅ All contracts verified successfully!");

  } catch (error) {
    console.error("❌ Error during verification:", error);
    console.log("You can manually verify contracts later using the addresses above");
  }

  // =============================================================================
  // STEP 6: Next Steps Instructions
  // =============================================================================

  console.log("\n" + "=".repeat(80));
  console.log("📋 NEXT STEPS FOR CEO:");
  console.log("=".repeat(80));
  console.log("1. ✅ TokenManager deployed - tokens are in your wallet");
  console.log("2. ✅ TokenPresale deployed - ready for presale");
  console.log("3. 🔄 Activate presale when ready:");
  console.log("   - Call setPresaleStatus(true) on TokenPresale contract");
  console.log("4. 📈 Monitor presale:");
  console.log("   - Users can buy with USDC/USDT on Arbitrum");
  console.log("5. 🔓 Control token unlocking:");
  console.log("   - Call setUnlockPercentage() to gradually release tokens");
  console.log("6. 💰 Withdraw presale funds:");
  console.log("   - Call withdrawUSDC() and withdrawPaymentToken() for USDT");
  
  console.log("\n🔗 USEFUL CONTRACT ADDRESSES:");
  console.log("TokenManager:", tokenManagerAddress);
  console.log("TokenPresale:", tokenPresaleAddress);
  console.log("Arbiscan TokenManager:", `https://arbiscan.io/address/${tokenManagerAddress}`);
  console.log("Arbiscan TokenPresale:", `https://arbiscan.io/address/${tokenPresaleAddress}`);

  console.log("\n" + "=".repeat(80));
  console.log("🚀 DEPLOYMENT COMPLETE - PROJECT MERLIN IS READY!");
  console.log("=".repeat(80));
}

// Error handling and execution
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 