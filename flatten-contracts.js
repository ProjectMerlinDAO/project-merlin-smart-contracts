const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("📄 Flattening contracts for BSC Testnet verification...\n");

    const contracts = [
        {
            name: "Oracle",
            file: "contracts/Oracle.sol",
            output: "flattened/Oracle_flattened.sol"
        },
        {
            name: "TokenManager", 
            file: "contracts/TokenManager.sol",
            output: "flattened/TokenManager_flattened.sol"
        },
        {
            name: "Bridge",
            file: "contracts/Bridge.sol", 
            output: "flattened/Bridge_flattened.sol"
        }
    ];

    // Create flattened directory if it doesn't exist
    const flattenedDir = path.join(__dirname, 'flattened');
    if (!fs.existsSync(flattenedDir)) {
        fs.mkdirSync(flattenedDir);
        console.log("📁 Created 'flattened' directory");
    }

    for (const contract of contracts) {
        try {
            console.log(`🔄 Flattening ${contract.name}...`);
            
            // Use hardhat flatten command
            const command = `npx hardhat flatten ${contract.file}`;
            const flattened = execSync(command, { encoding: 'utf8' });
            
            // Write flattened code to file
            const outputPath = path.join(__dirname, contract.output);
            fs.writeFileSync(outputPath, flattened);
            
            console.log(`✅ ${contract.name} flattened to: ${contract.output}`);
            console.log(`   File size: ${(flattened.length / 1024).toFixed(2)} KB\n`);
            
        } catch (error) {
            console.error(`❌ Error flattening ${contract.name}:`, error.message);
        }
    }

    console.log("📋 Verification Instructions:");
    console.log("========================================");
    console.log("1. Go to BSCScan Testnet: https://testnet.bscscan.com/");
    console.log("2. Navigate to each contract address");
    console.log("3. Click 'Contract' tab → 'Verify and Publish'");
    console.log("4. Use the flattened source code from the files above");
    console.log("5. Use these settings:");
    console.log("   - Compiler: Solidity (Single file)");
    console.log("   - Version: v0.8.19+commit.7dd6d404");
    console.log("   - Optimization: Yes (200 runs)");
    console.log("   - License: MIT License (MIT)");
    console.log("========================================");

    console.log("\n🔗 Contract Addresses (BSC Testnet):");
    console.log("- Oracle: 0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9");
    console.log("- TokenManager: 0xa64D0bCB4b6325C1ed68749727eA544366cca30e");
    console.log("- Bridge: 0xf42Bd569fffAE367716412D0C8d3605c204390c2");

    console.log("\n📝 Constructor Arguments (ABI-encoded):");
    console.log("Oracle:");
    console.log("0000000000000000000000005c3c97ea087024f91eb11d5659f1b5a3b911e971");
    
    console.log("\nTokenManager:");
    console.log("00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000295be96e64066972000000000000000000000000000000000000000000000000000000000000000000094d65726c696e2d393700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084d524c4e3337313400000000000000000000000000000000000000000000000");
    
    console.log("\nBridge:");
    console.log("000000000000000000000000a64d0bcb4b6325c1ed68749727ea544366cca30e00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000700e76c4dee9aa1a36b2ac1abe541615d42aabb90000000000000000000000005c3c97ea087024f91eb11d5659f1b5a3b911e971");

    console.log("\n🎉 Contract flattening completed!");
    console.log("You can now use the flattened files for manual verification on BSCScan Testnet.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 