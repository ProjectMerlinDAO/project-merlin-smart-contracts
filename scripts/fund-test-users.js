const { ethers } = require("hardhat");

async function main() {
    console.log("🪙 Funding Test Users with Mock Tokens...\n");

    // Get the ContractFactory and Signers
    const [deployer] = await ethers.getSigners();
    console.log("📝 Funding from account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Contract addresses
    const DEPLOYED_ADDRESSES = {
        USDC_TOKEN: "0x1A187060EF0fE163E1d9f820131a2Af983982Ac4",
        USDT_TOKEN: "0x9E2718A1f225baF94b7132993401bE959ce03640"
    };

    // Test user addresses (replace with actual addresses you want to fund)
    const TEST_USERS = [
        "0x5474Ebc6f9FA8A598203d7abe2893E2CbCC942A7", // Test Account 1
        "0x93573d1DAa58f892EDE7F12324607881E1673e05", // Test Account 2
        "0xf80629Eef6FD3208b72E8b26504Ff64eB53db6d2", // Test Account 3
        "0x03dBA63f6E20261707d393f9EBF2Df41826A26b8", // Test Account 4
        "0x0772fC5bb6B270a7F5fc78bf610034e66Dae38f4", // Test Account 5
    ];

    console.log("\n📋 Token Addresses:");
    console.log("- Mock USDC:", DEPLOYED_ADDRESSES.USDC_TOKEN);
    console.log("- Mock USDT:", DEPLOYED_ADDRESSES.USDT_TOKEN);

    // Connect to deployed contracts
    console.log("\n🔗 Connecting to deployed token contracts...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdcToken = MockERC20.attach(DEPLOYED_ADDRESSES.USDC_TOKEN);
    const usdtToken = MockERC20.attach(DEPLOYED_ADDRESSES.USDT_TOKEN);

    // Amount to give each user (1000 USDC and USDT)
    const amountToGive = ethers.parseUnits("1000", 6); // 6 decimals for USDC/USDT

    console.log("\n💰 Funding test users...");
    console.log("Amount per user:", ethers.formatUnits(amountToGive, 6), "tokens");

    for (let i = 0; i < TEST_USERS.length; i++) {
        const userAddress = TEST_USERS[i];
        console.log(`\n👤 Funding user ${i + 1}: ${userAddress}`);

        try {
            // Check current balances
            const usdcBalance = await usdcToken.balanceOf(userAddress);
            const usdtBalance = await usdtToken.balanceOf(userAddress);
            
            console.log("- Current USDC balance:", ethers.formatUnits(usdcBalance, 6));
            console.log("- Current USDT balance:", ethers.formatUnits(usdtBalance, 6));

            // Mint USDC tokens
            console.log("- Minting USDC tokens...");
            const usdcTx = await usdcToken.mint(userAddress, amountToGive);
            await usdcTx.wait();
            console.log("  ✅ USDC minted, tx:", usdcTx.hash);

            // Mint USDT tokens
            console.log("- Minting USDT tokens...");
            const usdtTx = await usdtToken.mint(userAddress, amountToGive);
            await usdtTx.wait();
            console.log("  ✅ USDT minted, tx:", usdtTx.hash);

            // Check new balances
            const newUsdcBalance = await usdcToken.balanceOf(userAddress);
            const newUsdtBalance = await usdtToken.balanceOf(userAddress);
            
            console.log("- New USDC balance:", ethers.formatUnits(newUsdcBalance, 6));
            console.log("- New USDT balance:", ethers.formatUnits(newUsdtBalance, 6));
            console.log("  🎉 User funded successfully!");

        } catch (error) {
            console.error(`❌ Error funding user ${userAddress}:`, error.message);
        }
    }

    // Self-fund deployer for testing
    console.log(`\n💰 Self-funding deployer: ${deployer.address}`);
    try {
        // Check current balances
        const deployerUsdcBalance = await usdcToken.balanceOf(deployer.address);
        const deployerUsdtBalance = await usdtToken.balanceOf(deployer.address);
        
        console.log("- Current USDC balance:", ethers.formatUnits(deployerUsdcBalance, 6));
        console.log("- Current USDT balance:", ethers.formatUnits(deployerUsdtBalance, 6));

        // Mint more tokens for deployer
        const deployerAmount = ethers.parseUnits("5000", 6); // Give deployer 5000 of each
        
        console.log("- Minting USDC tokens...");
        const deployerUsdcTx = await usdcToken.mint(deployer.address, deployerAmount);
        await deployerUsdcTx.wait();
        console.log("  ✅ USDC minted, tx:", deployerUsdcTx.hash);

        console.log("- Minting USDT tokens...");
        const deployerUsdtTx = await usdtToken.mint(deployer.address, deployerAmount);
        await deployerUsdtTx.wait();
        console.log("  ✅ USDT minted, tx:", deployerUsdtTx.hash);

        // Check new balances
        const newDeployerUsdcBalance = await usdcToken.balanceOf(deployer.address);
        const newDeployerUsdtBalance = await usdtToken.balanceOf(deployer.address);
        
        console.log("- New USDC balance:", ethers.formatUnits(newDeployerUsdcBalance, 6));
        console.log("- New USDT balance:", ethers.formatUnits(newDeployerUsdtBalance, 6));
        console.log("  🎉 Deployer funded successfully!");

    } catch (error) {
        console.error("❌ Error funding deployer:", error.message);
    }

    console.log("\n🎯 Summary:");
    console.log("=====================================");
    console.log("✅ Test users funded with 1,000 USDC and USDT each");
    console.log("✅ Deployer funded with 5,000 USDC and USDT");
    console.log("🔗 Users can now connect their wallets and purchase MRL tokens");
    console.log("📱 Frontend should show their token balances");
    console.log("💰 Min purchase: 100 USDC/USDT");
    console.log("💰 Max purchase: 500 USDC/USDT per user");
    console.log("🌐 Network: Arbitrum Sepolia");
    console.log("=====================================");

    console.log("\n📝 Instructions for Frontend Testing:");
    console.log("1. Import one of the funded private keys into MetaMask");
    console.log("2. Switch to Arbitrum Sepolia network");
    console.log("3. Visit the frontend and connect wallet");
    console.log("4. Open purchase modal and select USDC or USDT");
    console.log("5. Enter amount between 100-500 and buy tokens");
    console.log("6. Approve token spending when prompted");
    console.log("7. Complete purchase transaction");
    console.log("8. Verify tokens received in purchase summary");

    // Save funding info
    const fs = require('fs');
    const fundingInfo = {
        network: process.env.HARDHAT_NETWORK || "unknown",
        usdcToken: DEPLOYED_ADDRESSES.USDC_TOKEN,
        usdtToken: DEPLOYED_ADDRESSES.USDT_TOKEN,
        fundedUsers: TEST_USERS,
        amountPerUser: ethers.formatUnits(amountToGive, 6),
        deployerAmount: "5000",
        fundedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        'test-users-funding.json',
        JSON.stringify(fundingInfo, null, 2)
    );
    console.log("\n💾 Funding info saved to test-users-funding.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });

module.exports = { main }; 