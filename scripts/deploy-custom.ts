import {ethers} from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying ProjectDAO ecosystem with the account:", deployer.address);

    const TOKEN_NAME = "Merlin Token";
    const TOKEN_SYMBOL = "MRLN";
    const TOTAL_SUPPLY = ethers.parseEther("0"); // 800M tokens

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

}


main().catch(console.error)