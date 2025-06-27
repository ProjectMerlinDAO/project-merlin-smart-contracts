const hre = require("hardhat");
require("dotenv").config();

async function main() {
  // Get contract address from command line or environment variable
  const tokenPresaleAddress = process.env.TOKEN_PRESALE_ADDRESS || "0x120f79BfAFEb647bde171630B06b926ac4C35ceD";

  if (!tokenPresaleAddress) {
    console.error("Please set TOKEN_PRESALE_ADDRESS in your .env file");
    process.exit(1);
  }

  // Validate address
  if (!ethers.isAddress(tokenPresaleAddress)) {
    console.error("Invalid TokenPresale address:", tokenPresaleAddress);
    process.exit(1);
  }

  // Check for API key
  if (!process.env.ARBISCAN_API_KEY) {
    console.error("ARBISCAN_API_KEY not found in .env file");
    console.error("Please add your Arbiscan API key to verify contracts");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Verifying TokenPresale with the account:", deployer.address);
  
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (${network.chainId})`);

  // Use the contract parameters from the deployment information
  const tokenManagerAddress = process.env.TOKEN_MANAGER_ADDRESS || "0x0B3547CD0E14e7D42f8921b0c370FdFD708bff6C";
  const usdcAddress = process.env.USDC_ADDRESS || "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const usdtAddress = process.env.USDT_ADDRESS || "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  const tokenPrice = process.env.TOKEN_PRICE || "40000"; // $0.04 in USDC/USDT (6 decimals)
  const minBuyLimit = process.env.MIN_BUY_LIMIT || ethers.parseUnits("100", 6); // $100 minimum
  const maxBuyLimit = process.env.MAX_BUY_LIMIT || ethers.parseUnits("10000", 6); // $10,000 maximum per user
  const totalTokensForSale = process.env.TOTAL_TOKENS_FOR_SALE || ethers.parseEther("10000000"); // 10 million tokens for sale

  try {
    console.log("Contract parameters:");
    console.log("- TokenManager:", tokenManagerAddress);
    console.log("- USDC Address:", usdcAddress);
    console.log("- USDT Address:", usdtAddress);
    console.log("- Token Price:", tokenPrice);
    console.log("- Min Buy Limit:", ethers.formatUnits(minBuyLimit, 6), "USDC/USDT");
    console.log("- Max Buy Limit:", ethers.formatUnits(maxBuyLimit, 6), "USDC/USDT");
    console.log("- Total Tokens for Sale:", ethers.formatEther(totalTokensForSale), "tokens");
    
    console.log("Verifying TokenPresale contract...");
    
    // Verify contract
    await hre.run("verify:verify", {
      address: tokenPresaleAddress,
      constructorArguments: [
        tokenManagerAddress,
        usdcAddress,
        usdtAddress,
        tokenPrice,
        minBuyLimit,
        maxBuyLimit,
        totalTokensForSale
      ],
    });

    console.log("✅ TokenPresale contract verified successfully!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
    
    if (error.message.includes("Already Verified")) {
      console.log("Contract is already verified on Arbiscan.");
    } else if (error.message.includes("api key")) {
      console.error("API Key error. Check your ARBISCAN_API_KEY in .env file.");
    } else {
      console.error("You may need to provide the exact constructor arguments manually.");
      console.log("\nTry verifying manually with:");
      console.log(`npx hardhat verify --network arbitrumOne ${tokenPresaleAddress} ${tokenManagerAddress} ${usdcAddress} ${usdtAddress} ${tokenPrice} ${minBuyLimit} ${maxBuyLimit} ${totalTokensForSale}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 