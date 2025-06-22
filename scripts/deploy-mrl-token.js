const { ethers } = require("hardhat");

async function main() {
    console.log("🪙 Deploying MRL Token...\n");

    // Get the ContractFactory and Signers
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Deploy MRL Token
    console.log("\n🏗️  Deploying MRL Token...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mrlToken = await MockERC20.deploy(
        "Merlin Token",
        "MRL",
        18 // decimals
    );

    await mrlToken.waitForDeployment();
    const tokenAddress = await mrlToken.getAddress();
    console.log("✅ MRL Token deployed to:", tokenAddress);

    // Mint initial supply to deployer
    const initialSupply = ethers.parseEther("10000000"); // 10M tokens
    await mrlToken.mint(deployer.address, initialSupply);
    console.log("✅ Minted", ethers.formatEther(initialSupply), "MRL tokens to deployer");

    // Verify deployment
    console.log("\n🔍 Verifying token deployment...");
    const name = await mrlToken.name();
    const symbol = await mrlToken.symbol();
    const decimals = await mrlToken.decimals();
    const totalSupply = await mrlToken.totalSupply();
    const deployerBalance = await mrlToken.balanceOf(deployer.address);

    console.log("- Name:", name);
    console.log("- Symbol:", symbol);
    console.log("- Decimals:", decimals.toString());
    console.log("- Total Supply:", ethers.formatEther(totalSupply));
    console.log("- Deployer Balance:", ethers.formatEther(deployerBalance));

    // Summary
    console.log("\n📊 MRL Token Deployment Summary:");
    console.log("=====================================");
    console.log("MRL Token Address:", tokenAddress);
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals.toString());
    console.log("Total Supply:", ethers.formatEther(totalSupply));
    console.log("=====================================");

    // Save deployment info
    const fs = require('fs');
    const deploymentInfo = {
        network: process.env.HARDHAT_NETWORK || "unknown",
        mrlToken: tokenAddress,
        name: name,
        symbol: symbol,
        decimals: decimals.toString(),
        totalSupply: totalSupply.toString(),
        deployerBalance: deployerBalance.toString(),
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        'mrl-token-deployment.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n💾 MRL Token deployment info saved to mrl-token-deployment.json");
    console.log("\n🎯 Next Step: Use this address in your presale deployment:");
    console.log("MRL Token Address:", tokenAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = { main }; 