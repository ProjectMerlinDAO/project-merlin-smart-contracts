const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Enhanced TokenPresale Contract...\n");

    // Get signers
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);
    console.log("👤 User1:", user1.address);
    console.log("👤 User2:", user2.address);
    console.log("👤 User3:", user3.address);

    // Deploy mock tokens for testing
    console.log("\n🪙 Deploying Mock Tokens...");
    
    // Deploy MRL token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mrlToken = await MockERC20.deploy(
        "Merlin Token",
        "MRL",
        18,
        ethers.utils.parseEther("10000000") // 10M total supply
    );
    await mrlToken.deployed();
    console.log("✅ MRL Token deployed:", mrlToken.address);

    // Deploy USDC mock
    const usdcToken = await MockERC20.deploy(
        "USD Coin",
        "USDC",
        6,
        ethers.utils.parseUnits("1000000", 6) // 1M USDC supply
    );
    await usdcToken.deployed();
    console.log("✅ USDC Token deployed:", usdcToken.address);

    // Deploy USDT mock
    const usdtToken = await MockERC20.deploy(
        "Tether USD",
        "USDT",
        6,
        ethers.utils.parseUnits("1000000", 6) // 1M USDT supply
    );
    await usdtToken.deployed();
    console.log("✅ USDT Token deployed:", usdtToken.address);

    // Deploy TokenPresale
    console.log("\n🏗️  Deploying TokenPresale...");
    const TokenPresale = await ethers.getContractFactory("TokenPresale");
    const tokenPresale = await TokenPresale.deploy(
        mrlToken.address,
        usdcToken.address,
        usdtToken.address,
        "40000", // 0.04 USDC/USDT per MRL
        ethers.utils.parseUnits("100", 6), // 100 min
        ethers.utils.parseUnits("500", 6), // 500 max
        ethers.utils.parseEther("1000000") // 1M MRL for sale
    );
    await tokenPresale.deployed();
    console.log("✅ TokenPresale deployed:", tokenPresale.address);

    // Transfer MRL tokens to presale
    console.log("\n📦 Setting up presale...");
    await mrlToken.transfer(tokenPresale.address, ethers.utils.parseEther("1000000"));
    console.log("✅ Transferred 1M MRL to presale contract");

    // Distribute payment tokens to users
    const usdcAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDC each
    const usdtAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDT each
    
    await usdcToken.transfer(user1.address, usdcAmount);
    await usdcToken.transfer(user2.address, usdcAmount);
    await usdcToken.transfer(user3.address, usdcAmount);
    
    await usdtToken.transfer(user1.address, usdtAmount);
    await usdtToken.transfer(user2.address, usdtAmount);
    await usdtToken.transfer(user3.address, usdtAmount);
    
    console.log("✅ Distributed payment tokens to users");

    // Activate presale
    await tokenPresale.setPresaleStatus(true);
    console.log("✅ Presale activated");

    // Test 1: Check initial presale info
    console.log("\n📊 Test 1: Initial Presale Information");
    const presaleInfo = await tokenPresale.getExtendedPresaleInfo();
    console.log("- Token Price:", presaleInfo.tokenPrice.toString(), "(0.04 USDC/USDT per MRL)");
    console.log("- Min Buy Limit:", ethers.utils.formatUnits(presaleInfo.minBuyLimit, 6), "USDC/USDT");
    console.log("- Max Buy Limit:", ethers.utils.formatUnits(presaleInfo.maxBuyLimit, 6), "USDC/USDT");
    console.log("- Total for Sale:", ethers.utils.formatEther(presaleInfo.totalTokensForSale), "MRL");
    console.log("- Sold Percentage:", presaleInfo.soldPercentage.toString() / 100, "%");
    console.log("- Is Active:", presaleInfo.isActive);

    // Test 2: Try buying below minimum (should fail)
    console.log("\n❌ Test 2: Buy Below Minimum (Should Fail)");
    try {
        await usdcToken.connect(user1).approve(tokenPresale.address, ethers.utils.parseUnits("50", 6));
        await tokenPresale.connect(user1).buyTokens(
            usdcToken.address,
            ethers.utils.parseUnits("50", 6) // Below 100 minimum
        );
        console.log("ERROR: Should have failed!");
    } catch (error) {
        console.log("✅ Correctly rejected purchase below minimum:", error.reason);
    }

    // Test 3: Valid purchase with USDC
    console.log("\n✅ Test 3: Valid Purchase with USDC");
    const usdcPurchaseAmount = ethers.utils.parseUnits("200", 6); // 200 USDC
    await usdcToken.connect(user1).approve(tokenPresale.address, usdcPurchaseAmount);
    await tokenPresale.connect(user1).buyTokens(usdcToken.address, usdcPurchaseAmount);
    
    const user1Purchase = await tokenPresale.getUserPurchase(user1.address);
    console.log("- User1 MRL Bought:", ethers.utils.formatEther(user1Purchase.totalTokensBought));
    console.log("- User1 Payment Spent:", ethers.utils.formatUnits(user1Purchase.paymentSpent, 6), "USDC");

    // Test 4: Valid purchase with USDT
    console.log("\n✅ Test 4: Valid Purchase with USDT");
    const usdtPurchaseAmount = ethers.utils.parseUnits("150", 6); // 150 USDT
    await usdtToken.connect(user2).approve(tokenPresale.address, usdtPurchaseAmount);
    await tokenPresale.connect(user2).buyTokens(usdtToken.address, usdtPurchaseAmount);
    
    const user2Purchase = await tokenPresale.getUserPurchase(user2.address);
    console.log("- User2 MRL Bought:", ethers.utils.formatEther(user2Purchase.totalTokensBought));
    console.log("- User2 Payment Spent:", ethers.utils.formatUnits(user2Purchase.paymentSpent, 6), "USDT");

    // Test 5: Try to exceed maximum limit
    console.log("\n❌ Test 5: Exceed Maximum Limit (Should Fail)");
    try {
        const exceedAmount = ethers.utils.parseUnits("400", 6); // This would make user1 total 600 (above 500 max)
        await usdcToken.connect(user1).approve(tokenPresale.address, exceedAmount);
        await tokenPresale.connect(user1).buyTokens(usdcToken.address, exceedAmount);
        console.log("ERROR: Should have failed!");
    } catch (error) {
        console.log("✅ Correctly rejected purchase exceeding maximum:", error.reason);
    }

    // Test 6: Check sold percentage
    console.log("\n📈 Test 6: Check Sold Percentage");
    const updatedInfo = await tokenPresale.getExtendedPresaleInfo();
    console.log("- Total Sold:", ethers.utils.formatEther(updatedInfo.totalTokensSold), "MRL");
    console.log("- Sold Percentage:", updatedInfo.soldPercentage.toString() / 100, "%");
    console.log("- Total Payment Raised:", ethers.utils.formatUnits(updatedInfo.totalPaymentRaised, 6), "USDC/USDT");

    // Test 7: Set unlock percentage and claim tokens
    console.log("\n🔓 Test 7: Token Unlocking and Claiming");
    await tokenPresale.setUnlockPercentage(2500); // 25%
    console.log("✅ Set unlock percentage to 25%");

    const user1ClaimableBeforeClaim = await tokenPresale.getClaimableAmount(user1.address);
    console.log("- User1 Claimable:", ethers.utils.formatEther(user1ClaimableBeforeClaim), "MRL");

    // Claim tokens
    await tokenPresale.connect(user1).claimTokens();
    const user1MRLBalance = await mrlToken.balanceOf(user1.address);
    console.log("- User1 MRL Balance after claim:", ethers.utils.formatEther(user1MRLBalance), "MRL");

    // Test 8: Get user token status
    console.log("\n📊 Test 8: User Token Status");
    const user1Status = await tokenPresale.getUserTokenStatus(user1.address);
    console.log("User1 Token Status:");
    console.log("- Total Bought:", ethers.utils.formatEther(user1Status.totalTokensBought), "MRL");
    console.log("- Total Unlocked:", ethers.utils.formatEther(user1Status.totalUnlockedTokens), "MRL");
    console.log("- Total Claimed:", ethers.utils.formatEther(user1Status.totalClaimedTokens), "MRL");
    console.log("- Total Locked:", ethers.utils.formatEther(user1Status.totalLockedTokens), "MRL");
    console.log("- Claimable Now:", ethers.utils.formatEther(user1Status.claimableTokens), "MRL");

    // Test 9: Admin functions
    console.log("\n⚙️  Test 9: Admin Functions");
    
    // Add more tokens to presale
    const additionalTokens = ethers.utils.parseEther("500000"); // 500K more MRL
    await mrlToken.approve(tokenPresale.address, additionalTokens);
    await tokenPresale.addTokensToPresale(additionalTokens);
    console.log("✅ Added 500K more MRL to presale");

    // Update total tokens for sale
    await tokenPresale.setTotalTokensForSale(ethers.utils.parseEther("1500000")); // 1.5M total
    console.log("✅ Updated total tokens for sale to 1.5M MRL");

    // Test 10: Payment token management
    console.log("\n💰 Test 10: Payment Token Management");
    console.log("- USDC Accepted:", await tokenPresale.isPaymentTokenAccepted(usdcToken.address));
    console.log("- USDT Accepted:", await tokenPresale.isPaymentTokenAccepted(usdtToken.address));
    
    // Check balances
    console.log("- Contract USDC Balance:", ethers.utils.formatUnits(await tokenPresale.getContractPaymentBalance(usdcToken.address), 6));
    console.log("- Contract USDT Balance:", ethers.utils.formatUnits(await tokenPresale.getContractPaymentBalance(usdtToken.address), 6));

    // Test 11: Withdraw payments
    console.log("\n💸 Test 11: Withdraw Payments");
    const contractUSDCBalance = await tokenPresale.getContractPaymentBalance(usdcToken.address);
    if (contractUSDCBalance.gt(0)) {
        await tokenPresale.withdrawPaymentToken(usdcToken.address, contractUSDCBalance);
        console.log("✅ Withdrew", ethers.utils.formatUnits(contractUSDCBalance, 6), "USDC");
    }

    const contractUSDTBalance = await tokenPresale.getContractPaymentBalance(usdtToken.address);
    if (contractUSDTBalance.gt(0)) {
        await tokenPresale.withdrawPaymentToken(usdtToken.address, contractUSDTBalance);
        console.log("✅ Withdrew", ethers.utils.formatUnits(contractUSDTBalance, 6), "USDT");
    }

    // Final summary
    console.log("\n📋 Final Summary:");
    const finalInfo = await tokenPresale.getExtendedPresaleInfo();
    console.log("=====================================");
    console.log("Total MRL Sold:", ethers.utils.formatEther(finalInfo.totalTokensSold));
    console.log("Sold Percentage:", finalInfo.soldPercentage.toString() / 100, "%");
    console.log("Total Payment Raised:", ethers.utils.formatUnits(finalInfo.totalPaymentRaised, 6), "USDC/USDT");
    console.log("Total Purchasers:", (await tokenPresale.getTotalPurchasers()).toString());
    console.log("Current Unlock %:", finalInfo.currentUnlockPercentage.toString() / 100, "%");
    console.log("=====================================");

    console.log("\n🎉 All tests completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 