const { ethers } = require("hardhat");

async function main() {
    console.log("🔑 Generating Test Accounts for Frontend Testing...\n");

    // Generate 5 test accounts
    const testAccounts = [];
    
    for (let i = 0; i < 5; i++) {
        const wallet = ethers.Wallet.createRandom();
        testAccounts.push({
            index: i + 1,
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic?.phrase || "N/A"
        });
    }

    console.log("📋 Generated Test Accounts:");
    console.log("=====================================");
    
    testAccounts.forEach(account => {
        console.log(`\n👤 Test Account ${account.index}:`);
        console.log(`Address: ${account.address}`);
        console.log(`Private Key: ${account.privateKey}`);
        console.log(`Mnemonic: ${account.mnemonic}`);
        console.log("---");
    });

    console.log("\n🔗 Contract Addresses (Arbitrum Sepolia):");
    console.log("TOKEN_PRESALE: 0x7A453e4d7C48A22aBf68625757BC3551b10B51b5");
    console.log("MRL_TOKEN: 0x9ee7a29264e631fcE96f5E68A50CB5Aa2a1dFb15");
    console.log("USDC_TOKEN: 0x1A187060EF0fE163E1d9f820131a2Af983982Ac4");
    console.log("USDT_TOKEN: 0x9E2718A1f225baF94b7132993401bE959ce03640");

    console.log("\n📝 How to Use These Accounts:");
    console.log("=====================================");
    console.log("1. Copy any private key from above");
    console.log("2. Open MetaMask → Account Menu → Import Account");
    console.log("3. Paste the private key");
    console.log("4. Switch to Arbitrum Sepolia network");
    console.log("5. Get test ETH from faucet: https://faucet.quicknode.com/arbitrum/sepolia");
    console.log("6. Run the funding script to get test USDC/USDT tokens");
    console.log("7. Test the frontend purchase functionality");

    console.log("\n🌐 Arbitrum Sepolia Network Settings:");
    console.log("=====================================");
    console.log("Network Name: Arbitrum Sepolia");
    console.log("RPC URL: https://sepolia-rollup.arbitrum.io/rpc");
    console.log("Chain ID: 421614");
    console.log("Currency Symbol: ETH");
    console.log("Block Explorer: https://sepolia.arbiscan.io/");

    // Save to file for easy access
    const fs = require('fs');
    const accountsData = {
        network: "Arbitrum Sepolia",
        chainId: 421614,
        contracts: {
            TOKEN_PRESALE: "0x7A453e4d7C48A22aBf68625757BC3551b10B51b5",
            MRL_TOKEN: "0x9ee7a29264e631fcE96f5E68A50CB5Aa2a1dFb15",
            USDC_TOKEN: "0x1A187060EF0fE163E1d9f820131a2Af983982Ac4",
            USDT_TOKEN: "0x9E2718A1f225baF94b7132993401bE959ce03640"
        },
        testAccounts: testAccounts,
        instructions: [
            "1. Import private key into MetaMask",
            "2. Switch to Arbitrum Sepolia network",
            "3. Get test ETH from faucet",
            "4. Run funding script to get test tokens",
            "5. Test frontend purchase functionality"
        ],
        faucets: [
            "https://faucet.quicknode.com/arbitrum/sepolia",
            "https://www.alchemy.com/faucets/arbitrum-sepolia"
        ],
        generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        'test-accounts.json',
        JSON.stringify(accountsData, null, 2)
    );

    console.log("\n💾 Test accounts saved to 'test-accounts.json'");
    console.log("\n⚠️  SECURITY WARNING:");
    console.log("=====================================");
    console.log("🔒 These are test accounts for development only!");
    console.log("🔒 Never use these private keys on mainnet!");
    console.log("🔒 Only use test tokens, never real funds!");
    console.log("🔒 Keep private keys secure and don't share publicly!");

    // Extract just addresses for the funding script
    const addresses = testAccounts.map(account => account.address);
    
    console.log("\n📋 Addresses for Funding Script:");
    console.log("=====================================");
    addresses.forEach((address, index) => {
        console.log(`"${address}",${index === addresses.length - 1 ? '' : ''} // Test Account ${index + 1}`);
    });

    return { testAccounts, addresses };
}

main()
    .then((result) => {
        console.log("\n✅ Test accounts generated successfully!");
        console.log("Next step: Update fund-test-users.js with these addresses and run it.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });

module.exports = { main }; 