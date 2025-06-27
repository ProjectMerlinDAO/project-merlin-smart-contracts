const hre = require("hardhat");
require("dotenv").config();

async function main() {
  // Get contract address from command line or environment variable
  const tokenManagerAddress = process.env.TOKEN_MANAGER_ADDRESS;

  if (!tokenManagerAddress) {
    console.error("Please set TOKEN_MANAGER_ADDRESS in your .env file");
    process.exit(1);
  }

  // Validate address
  if (!ethers.isAddress(tokenManagerAddress)) {
    console.error("Invalid TokenManager address:", tokenManagerAddress);
    process.exit(1);
  }

  // Check for API key
  if (!process.env.ARBISCAN_API_KEY) {
    console.error("ARBISCAN_API_KEY not found in .env file");
    console.error("Please add your Arbiscan API key to verify contracts");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Verifying TokenManager with the account:", deployer.address);
  
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (${network.chainId})`);

  // Connect to the TokenManager contract to get constructor parameters
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = TokenManager.attach(tokenManagerAddress);

  try {
    // Get contract parameters
    const name = await tokenManager.name();
    const symbol = await tokenManager.symbol();
    
    console.log("Contract parameters:");
    console.log("- Name:", name);
    console.log("- Symbol:", symbol);
    
    console.log("Verifying TokenManager contract...");
    
    // Get constructor arguments - TokenManager only has 3 parameters
    const totalSupply = process.env.TOTAL_SUPPLY || "800000000"; // Default 800M
    
    // Verify contract with the correct number of parameters (3)
    await hre.run("verify:verify", {
      address: tokenManagerAddress,
      constructorArguments: [
        name,
        symbol,
        ethers.parseEther(totalSupply)
      ],
    });

    console.log("✅ TokenManager contract verified successfully!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
    
    if (error.message.includes("Already Verified")) {
      console.log("Contract is already verified on Arbiscan.");
    } else if (error.message.includes("api key")) {
      console.error("API Key error. Check your ARBISCAN_API_KEY in .env file.");
    } else {
      console.error("You may need to provide the exact constructor arguments manually.");
      console.log("\nTry verifying manually with:");
      console.log(`npx hardhat verify --network arbitrumOne ${tokenManagerAddress} "Merlin" "MRLN" ${ethers.parseEther("800000000")}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 