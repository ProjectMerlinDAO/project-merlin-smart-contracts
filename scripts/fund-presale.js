const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Funding Presale Contract with MRL Tokens...\n");

    // Get the ContractFactory and Signers
    const [deployer] = await ethers.getSigners();
    console.log("📝 Funding from account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Contract addresses (update these with your deployed addresses)
    const DEPLOYED_ADDRESSES = {
        MRL_TOKEN: "0x9ee7a29264e631fcE96f5E68A50CB5Aa2a1dFb15",
        TOKEN_PRESALE: "0x7A453e4d7C48A22aBf68625757BC3551b10B51b5"
    };

    console.log("\n📋 Contract Addresses:");
    console.log("- MRL Token:", DEPLOYED_ADDRESSES.MRL_TOKEN);
    console.log("- TokenPresale:", DEPLOYED_ADDRESSES.TOKEN_PRESALE);

    // Connect to deployed contracts
    console.log("\n🔗 Connecting to deployed contracts...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const TokenPresale = await ethers.getContractFactory("TokenPresale");
    
    const mrlToken = MockERC20.attach(DEPLOYED_ADDRESSES.MRL_TOKEN);
    const tokenPresale = TokenPresale.attach(DEPLOYED_ADDRESSES.TOKEN_PRESALE);

    // Get presale info to see how many tokens we need
    console.log("\n🔍 Getting presale information...");
    const presaleInfo = await tokenPresale.getExtendedPresaleInfo();
    const totalTokensForSale = presaleInfo.totalTokensForSale;
    
    console.log("- Total Tokens for Sale:", ethers.formatEther(totalTokensForSale), "MRL");
    console.log("- Current Contract Token Balance:", ethers.formatEther(await tokenPresale.getContractTokenBalance()), "MRL");

    // Check deployer's MRL balance
    const deployerMrlBalance = await mrlToken.balanceOf(deployer.address);
    console.log("- Deployer MRL Balance:", ethers.formatEther(deployerMrlBalance), "MRL");

    // Calculate how many tokens to transfer (we'll transfer exactly what's needed for sale)
    const tokensToTransfer = totalTokensForSale;
    console.log("- Tokens to Transfer:", ethers.formatEther(tokensToTransfer), "MRL");

    // Verify deployer has enough tokens
    if (deployerMrlBalance < tokensToTransfer) {
        console.log("❌ Error: Deployer doesn't have enough MRL tokens!");
        console.log("Required:", ethers.formatEther(tokensToTransfer));
        console.log("Available:", ethers.formatEther(deployerMrlBalance));
        return;
    }

    // Transfer tokens to presale contract
    console.log("\n💸 Transferring MRL tokens to presale contract...");
    const transferTx = await mrlToken.transfer(DEPLOYED_ADDRESSES.TOKEN_PRESALE, tokensToTransfer);
    console.log("Transaction Hash:", transferTx.hash);
    
    // Wait for confirmation
    console.log("⏳ Waiting for transaction confirmation...");
    await transferTx.wait(2); // Wait for 2 confirmations
    console.log("✅ Transfer confirmed!");

    // Verify the transfer
    console.log("\n🔍 Verifying transfer...");
    const newContractBalance = await tokenPresale.getContractTokenBalance();
    const newDeployerBalance = await mrlToken.balanceOf(deployer.address);
    
    console.log("- Presale Contract MRL Balance:", ethers.formatEther(newContractBalance), "MRL");
    console.log("- Deployer MRL Balance:", ethers.formatEther(newDeployerBalance), "MRL");

    // Check if presale is ready
    const isReadyForSale = newContractBalance >= totalTokensForSale;
    console.log("- Presale Ready for Sale:", isReadyForSale ? "✅ YES" : "❌ NO");

    // Summary
    console.log("\n📊 Funding Summary:");
    console.log("=====================================");
    console.log("MRL Tokens Transferred:", ethers.formatEther(tokensToTransfer));
    console.log("Presale Contract Balance:", ethers.formatEther(newContractBalance), "MRL");
    console.log("Total Tokens for Sale:", ethers.formatEther(totalTokensForSale), "MRL");
    console.log("Coverage:", ((newContractBalance * 100n) / totalTokensForSale).toString() + "%");
    console.log("=====================================");

    if (isReadyForSale) {
        console.log("\n🎉 SUCCESS! Presale contract is now funded and ready!");
        console.log("\n🎯 Next Steps:");
        console.log("1. ✅ Transfer MRL tokens to presale contract (COMPLETED)");
        console.log("2. 🔄 Activate the presale using setPresaleStatus(true)");
        console.log("3. 🔓 Set unlock percentages as needed");
        console.log("4. 📊 Monitor the presale progress");
    } else {
        console.log("\n⚠️  WARNING: Presale contract may not have enough tokens!");
    }

    // Save funding info
    const fs = require('fs');
    const fundingInfo = {
        network: process.env.HARDHAT_NETWORK || "unknown",
        mrlToken: DEPLOYED_ADDRESSES.MRL_TOKEN,
        tokenPresale: DEPLOYED_ADDRESSES.TOKEN_PRESALE,
        tokensTransferred: tokensToTransfer.toString(),
        presaleContractBalance: newContractBalance.toString(),
        deployerBalance: newDeployerBalance.toString(),
        totalTokensForSale: totalTokensForSale.toString(),
        transactionHash: transferTx.hash,
        fundedAt: new Date().toISOString(),
        isReadyForSale: isReadyForSale
    };

    fs.writeFileSync(
        'presale-funding.json',
        JSON.stringify(fundingInfo, null, 2)
    );
    console.log("\n💾 Funding info saved to presale-funding.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });

module.exports = { main }; 