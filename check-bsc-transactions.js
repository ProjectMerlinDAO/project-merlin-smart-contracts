const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking BSC Testnet Transactions and Contracts...\n");

    // Contract addresses from our deployment
    const DEPLOYED_ADDRESSES = {
        ORACLE: "0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9",
        TOKEN_MANAGER: "0xa64D0bCB4b6325C1ed68749727eA544366cca30e",
        BRIDGE: "0xf42Bd569fffAE367716412D0C8d3605c204390c2"
    };

    // Recent transaction hashes from our tests
    const TRANSACTION_HASHES = [
        "0xf839768641ca9e7784d3221dd3173b274bf25ce951964ce917e6c1c074e20879", // Bridge transfer
        "0x8dad86dcd588beca785ca315212c5ad26994bbb750de5099937b4916ac439775", // Cross-chain mint
        "0x3815d3c576ad122bccb5498698f806749174979450b78f6c0dcc73da815886a3"  // Token approval
    ];

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log("Network:", network.name, "(Chain ID:", network.chainId.toString() + ")");
    console.log("Your account:", deployer.address);
    console.log("");

    // Check if we're on BSC testnet
    if (Number(network.chainId) !== 97) {
        console.log("⚠️ You're not on BSC Testnet (Chain ID: 97)");
        console.log("Current Chain ID:", network.chainId.toString());
        return;
    }

    console.log("🌐 BSC Testnet Explorer Links:");
    console.log("=====================================");
    
    // Contract links
    console.log("\n📋 Contract Addresses:");
    console.log(`Oracle: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.ORACLE}`);
    console.log(`TokenManager: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.TOKEN_MANAGER}`);
    console.log(`Bridge: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.BRIDGE}`);
    console.log(`Your Account: https://testnet.bscscan.com/address/${deployer.address}`);

    // Transaction links
    console.log("\n📋 Recent Transaction Hashes:");
    TRANSACTION_HASHES.forEach((hash, index) => {
        const labels = ["Bridge Transfer", "Cross-chain Mint", "Token Approval"];
        console.log(`${labels[index]}: https://testnet.bscscan.com/tx/${hash}`);
    });

    // Check transaction status
    console.log("\n🔍 Checking Transaction Status:");
    console.log("=====================================");
    
    for (let i = 0; i < TRANSACTION_HASHES.length; i++) {
        const hash = TRANSACTION_HASHES[i];
        const labels = ["Bridge Transfer", "Cross-chain Mint", "Token Approval"];
        
        try {
            const receipt = await ethers.provider.getTransactionReceipt(hash);
            if (receipt) {
                console.log(`✅ ${labels[i]}:`);
                console.log(`   - Hash: ${hash}`);
                console.log(`   - Block: ${receipt.blockNumber}`);
                console.log(`   - Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
                console.log(`   - Gas Used: ${receipt.gasUsed.toString()}`);
                console.log(`   - Link: https://testnet.bscscan.com/tx/${hash}`);
            } else {
                console.log(`❌ ${labels[i]}: Transaction not found`);
            }
        } catch (error) {
            console.log(`❌ ${labels[i]}: Error checking transaction - ${error.message}`);
        }
        console.log("");
    }

    // Check contract verification status
    console.log("🔍 Contract Information:");
    console.log("=====================================");
    
    const TokenManager = await ethers.getContractFactory("TokenManager");
    const tokenManager = TokenManager.attach(DEPLOYED_ADDRESSES.TOKEN_MANAGER);
    
    const Bridge = await ethers.getContractFactory("Bridge");
    const bridge = Bridge.attach(DEPLOYED_ADDRESSES.BRIDGE);

    try {
        // Check TokenManager
        const tokenName = await tokenManager.name();
        const tokenSymbol = await tokenManager.symbol();
        const totalSupply = await tokenManager.totalSupply();
        const yourBalance = await tokenManager.balanceOf(deployer.address);
        const bridgeBalance = await tokenManager.balanceOf(DEPLOYED_ADDRESSES.BRIDGE);

        console.log("📊 TokenManager Contract:");
        console.log(`   - Name: ${tokenName}`);
        console.log(`   - Symbol: ${tokenSymbol}`);
        console.log(`   - Total Supply: ${ethers.formatEther(totalSupply)} tokens`);
        console.log(`   - Your Balance: ${ethers.formatEther(yourBalance)} tokens`);
        console.log(`   - Bridge Balance: ${ethers.formatEther(bridgeBalance)} tokens`);
        console.log(`   - Contract: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.TOKEN_MANAGER}`);
        console.log("");

        // Check Bridge
        const transferFee = await bridge.transferFee();
        const operationFee = await bridge.operationFee();
        const isPaused = await bridge.paused();

        console.log("🌉 Bridge Contract:");
        console.log(`   - Transfer Fee: ${transferFee} basis points (${Number(transferFee)/100}%)`);
        console.log(`   - Operation Fee: ${ethers.formatEther(operationFee)} tokens`);
        console.log(`   - Paused: ${isPaused}`);
        console.log(`   - Contract: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.BRIDGE}`);
        console.log("");

    } catch (error) {
        console.log("❌ Error reading contract data:", error.message);
    }

    // Instructions for viewing on BSCScan
    console.log("📖 How to View on BSCScan:");
    console.log("=====================================");
    console.log("1. Open any of the links above in your browser");
    console.log("2. For contracts: Click 'Contract' tab to see the code");
    console.log("3. For transactions: View details, logs, and internal transactions");
    console.log("4. For your account: See all your transactions and token balances");
    console.log("");
    
    console.log("🔧 Troubleshooting:");
    console.log("=====================================");
    console.log("• If transactions don't appear: Wait a few minutes for indexing");
    console.log("• If contracts show 'Contract not verified': This is normal for testnet");
    console.log("• BSC Testnet can be slower than mainnet");
    console.log("• Make sure you're using testnet.bscscan.com (not bscscan.com)");
    console.log("");

    console.log("✅ Check complete! Use the links above to explore your transactions.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 