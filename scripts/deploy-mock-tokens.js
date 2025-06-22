const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Deploying Mock Payment Tokens (USDC & USDT)...\n");

    // Get the ContractFactory and Signers
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Deploy Mock USDC
    console.log("\n🏗️  Deploying Mock USDC...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockERC20.deploy(
        "USD Coin",
        "USDC",
        6 // USDC has 6 decimals
    );

    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    console.log("✅ Mock USDC deployed to:", usdcAddress);

    // Deploy Mock USDT
    console.log("\n🏗️  Deploying Mock USDT...");
    const mockUSDT = await MockERC20.deploy(
        "Tether USD",
        "USDT",
        6 // USDT has 6 decimals
    );

    await mockUSDT.waitForDeployment();
    const usdtAddress = await mockUSDT.getAddress();
    console.log("✅ Mock USDT deployed to:", usdtAddress);

    // Mint initial supply for testing
    const initialSupply = ethers.parseUnits("1000000", 6); // 1M tokens each
    await mockUSDC.mint(deployer.address, initialSupply);
    await mockUSDT.mint(deployer.address, initialSupply);
    
    console.log("✅ Minted", ethers.formatUnits(initialSupply, 6), "USDC to deployer");
    console.log("✅ Minted", ethers.formatUnits(initialSupply, 6), "USDT to deployer");

    // Verify deployments
    console.log("\n🔍 Verifying token deployments...");
    
    // USDC
    const usdcName = await mockUSDC.name();
    const usdcSymbol = await mockUSDC.symbol();
    const usdcDecimals = await mockUSDC.decimals();
    const usdcBalance = await mockUSDC.balanceOf(deployer.address);
    
    // USDT
    const usdtName = await mockUSDT.name();
    const usdtSymbol = await mockUSDT.symbol();
    const usdtDecimals = await mockUSDT.decimals();
    const usdtBalance = await mockUSDT.balanceOf(deployer.address);

    console.log("\nUSDC:");
    console.log("- Name:", usdcName);
    console.log("- Symbol:", usdcSymbol);
    console.log("- Decimals:", usdcDecimals.toString());
    console.log("- Deployer Balance:", ethers.formatUnits(usdcBalance, 6));

    console.log("\nUSDT:");
    console.log("- Name:", usdtName);
    console.log("- Symbol:", usdtSymbol);
    console.log("- Decimals:", usdtDecimals.toString());
    console.log("- Deployer Balance:", ethers.formatUnits(usdtBalance, 6));

    // Summary
    console.log("\n📊 Mock Payment Tokens Deployment Summary:");
    console.log("=====================================");
    console.log("Mock USDC Address:", usdcAddress);
    console.log("Mock USDT Address:", usdtAddress);
    console.log("=====================================");

    // Save deployment info
    const fs = require('fs');
    const deploymentInfo = {
        network: process.env.HARDHAT_NETWORK || "unknown",
        mockUSDC: usdcAddress,
        mockUSDT: usdtAddress,
        usdcDecimals: usdcDecimals.toString(),
        usdtDecimals: usdtDecimals.toString(),
        deployerUsdcBalance: usdcBalance.toString(),
        deployerUsdtBalance: usdtBalance.toString(),
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        'mock-payment-tokens-deployment.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n💾 Mock payment tokens deployment info saved to mock-payment-tokens-deployment.json");
    console.log("\n🎯 Next Step: Use these addresses in your presale deployment:");
    console.log("Mock USDC Address:", usdcAddress);
    console.log("Mock USDT Address:", usdtAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = { main }; 