const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Activating Presale Contract...\n");

    // Get the ContractFactory and Signers
    const [deployer] = await ethers.getSigners();
    console.log("📝 Activating from account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Contract addresses (update these with your deployed addresses)
    const DEPLOYED_ADDRESSES = {
        TOKEN_PRESALE: "0x7A453e4d7C48A22aBf68625757BC3551b10B51b5"
    };

    console.log("\n📋 Contract Address:");
    console.log("- TokenPresale:", DEPLOYED_ADDRESSES.TOKEN_PRESALE);

    // Connect to deployed contract
    console.log("\n🔗 Connecting to deployed TokenPresale contract...");
    const TokenPresale = await ethers.getContractFactory("TokenPresale");
    const tokenPresale = TokenPresale.attach(DEPLOYED_ADDRESSES.TOKEN_PRESALE);

    // Check current presale status
    console.log("\n🔍 Checking current presale status...");
    const currentStatus = await tokenPresale.isPresaleActive();
    console.log("- Current Status:", currentStatus ? "✅ ACTIVE" : "❌ INACTIVE");

    if (currentStatus) {
        console.log("\n⚠️  Presale is already active!");
        return;
    }

    // Get presale info before activation
    const presaleInfo = await tokenPresale.getExtendedPresaleInfo();
    const contractBalance = await tokenPresale.getContractTokenBalance();
    
    console.log("\n📋 Pre-Activation Status:");
    console.log("- Contract Token Balance:", ethers.formatEther(contractBalance), "MRL");
    console.log("- Total Tokens for Sale:", ethers.formatEther(presaleInfo.totalTokensForSale), "MRL");
    console.log("- Token Price:", presaleInfo.tokenPrice.toString(), "USDC/USDT per MRL");
    console.log("- Min Buy Limit:", ethers.formatUnits(presaleInfo.minBuyLimit, 6), "USDC/USDT");
    console.log("- Max Buy Limit:", ethers.formatUnits(presaleInfo.maxBuyLimit, 6), "USDC/USDT");
    console.log("- Current Unlock %:", presaleInfo.currentUnlockPercentage.toString() / 100, "%");

    // Verify contract has enough tokens
    const isReadyForSale = contractBalance >= presaleInfo.totalTokensForSale;
    if (!isReadyForSale) {
        console.log("\n❌ ERROR: Contract doesn't have enough tokens for sale!");
        console.log("Required:", ethers.formatEther(presaleInfo.totalTokensForSale));
        console.log("Available:", ethers.formatEther(contractBalance));
        console.log("Please fund the contract first using the fund-presale script.");
        return;
    }

    // Activate the presale
    console.log("\n🚀 Activating presale...");
    const activateTx = await tokenPresale.setPresaleStatus(true);
    console.log("Transaction Hash:", activateTx.hash);
    
    // Wait for confirmation
    console.log("⏳ Waiting for transaction confirmation...");
    await activateTx.wait(2); // Wait for 2 confirmations
    console.log("✅ Activation confirmed!");

    // Verify activation
    console.log("\n🔍 Verifying activation...");
    const newStatus = await tokenPresale.isPresaleActive();
    console.log("- New Status:", newStatus ? "✅ ACTIVE" : "❌ INACTIVE");

    // Get updated presale info
    const updatedInfo = await tokenPresale.getExtendedPresaleInfo();
    
    console.log("\n📊 Post-Activation Status:");
    console.log("=====================================");
    console.log("Presale Status:", updatedInfo.isActive ? "✅ ACTIVE" : "❌ INACTIVE");
    console.log("Contract Token Balance:", ethers.formatEther(contractBalance), "MRL");
    console.log("Total Tokens for Sale:", ethers.formatEther(updatedInfo.totalTokensForSale), "MRL");
    console.log("Tokens Sold:", ethers.formatEther(updatedInfo.totalTokensSold), "MRL");
    console.log("Sold Percentage:", (Number(updatedInfo.soldPercentage) / 100).toString() + "%");
    console.log("Payment Raised:", ethers.formatUnits(updatedInfo.totalPaymentRaised, 6), "USDC/USDT");
    console.log("=====================================");

    if (newStatus) {
        console.log("\n🎉 SUCCESS! Presale is now ACTIVE and ready for purchases!");
        console.log("\n🎯 Presale Configuration:");
        console.log("- Price: 1 MRL = 0.04 USDC/USDT");
        console.log("- Min Purchase: 100 USDC/USDT");
        console.log("- Max Purchase: 500 USDC/USDT per user");
        console.log("- Payment Tokens: USDC ✅ & USDT ✅");
        console.log("- Pause Protection: ✅ Enabled");
        
        console.log("\n📱 Users can now:");
        console.log("1. Buy tokens with USDC or USDT");
        console.log("2. Claim unlocked tokens (when you set unlock percentages)");
        console.log("3. View their purchase and token status");
        
        console.log("\n👨‍💼 Admin Controls:");
        console.log("1. setUnlockPercentage() - Unlock tokens for claiming");
        console.log("2. setTokenPrice() - Update token price");
        console.log("3. setMinBuyLimit() / setMaxBuyLimit() - Update limits");
        console.log("4. pause() / unpause() - Emergency controls");
        console.log("5. withdrawPaymentToken() - Withdraw USDC/USDT");
    } else {
        console.log("\n❌ FAILED: Presale activation failed!");
    }

    // Save activation info
    const fs = require('fs');
    const activationInfo = {
        network: process.env.HARDHAT_NETWORK || "unknown",
        tokenPresale: DEPLOYED_ADDRESSES.TOKEN_PRESALE,
        previousStatus: currentStatus,
        newStatus: newStatus,
        contractBalance: contractBalance.toString(),
        totalTokensForSale: updatedInfo.totalTokensForSale.toString(),
        tokenPrice: updatedInfo.tokenPrice.toString(),
        minBuyLimit: updatedInfo.minBuyLimit.toString(),
        maxBuyLimit: updatedInfo.maxBuyLimit.toString(),
        transactionHash: activateTx.hash,
        activatedAt: new Date().toISOString(),
        isSuccessful: newStatus
    };

    fs.writeFileSync(
        'presale-activation.json',
        JSON.stringify(activationInfo, null, 2)
    );
    console.log("\n💾 Activation info saved to presale-activation.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });

module.exports = { main }; 