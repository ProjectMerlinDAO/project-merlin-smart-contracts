const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting deployment to Arbitrum...\n");

    // Get the ContractFactory and Signers
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying contracts with the account:", deployer.address);
    console.log("�� Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Arbitrum token addresses
    const ARBITRUM_ADDRESSES = {
        // Mock tokens deployed on Arbitrum Sepolia testnet
        USDC: "0x1A187060EF0fE163E1d9f820131a2Af983982Ac4", // Mock USDC
        USDT: "0x9E2718A1f225baF94b7132993401bE959ce03640", // Mock USDT
        // MRL token deployed on Arbitrum Sepolia
        MRL: "0x9ee7a29264e631fcE96f5E68A50CB5Aa2a1dFb15" // Deployed MRL token address
    };

    // Deployment parameters
    const DEPLOYMENT_PARAMS = {
        // Token addresses
        token: ARBITRUM_ADDRESSES.MRL,
        usdc: ARBITRUM_ADDRESSES.USDC,
        usdt: ARBITRUM_ADDRESSES.USDT,
        
        // Price: 1 MRL = 0.04 USDC/USDT
        // Since USDC/USDT have 6 decimals: 0.04 * 10^6 = 40000
        tokenPrice: "40000", // 0.04 USDC/USDT per token
        
        // Buy limits in USDC/USDT (with 6 decimals)
        minBuyLimit: ethers.parseUnits("100", 6), // 100 USDC/USDT minimum
        maxBuyLimit: ethers.parseUnits("500", 6), // 500 USDC/USDT maximum
        
        // Total tokens for sale (assuming MRL has 18 decimals)
        // You can adjust this based on your requirements
        totalTokensForSale: ethers.parseEther("1000000") // 1M MRL tokens
    };

    console.log("\n📋 Deployment Parameters:");
    console.log("- MRL Token:", DEPLOYMENT_PARAMS.token);
    console.log("- USDC Token:", DEPLOYMENT_PARAMS.usdc);
    console.log("- USDT Token:", DEPLOYMENT_PARAMS.usdt);
    console.log("- Token Price:", DEPLOYMENT_PARAMS.tokenPrice, "USDC/USDT per MRL");
    console.log("- Min Buy Limit:", ethers.formatUnits(DEPLOYMENT_PARAMS.minBuyLimit, 6), "USDC/USDT");
    console.log("- Max Buy Limit:", ethers.formatUnits(DEPLOYMENT_PARAMS.maxBuyLimit, 6), "USDC/USDT");
    console.log("- Total Tokens for Sale:", ethers.formatEther(DEPLOYMENT_PARAMS.totalTokensForSale), "MRL");

    // Deploy TokenPresale contract
    console.log("\n🏗️  Deploying TokenPresale contract...");
    const TokenPresale = await ethers.getContractFactory("TokenPresale");
    const tokenPresale = await TokenPresale.deploy(
        DEPLOYMENT_PARAMS.token,
        DEPLOYMENT_PARAMS.usdc,
        DEPLOYMENT_PARAMS.usdt,
        DEPLOYMENT_PARAMS.tokenPrice,
        DEPLOYMENT_PARAMS.minBuyLimit,
        DEPLOYMENT_PARAMS.maxBuyLimit,
        DEPLOYMENT_PARAMS.totalTokensForSale
    );

    await tokenPresale.waitForDeployment();
    console.log("✅ TokenPresale deployed to:", await tokenPresale.getAddress());

    // Wait for a few block confirmations
    console.log("\n⏳ Waiting for block confirmations...");
    const deploymentTx = tokenPresale.deploymentTransaction();
    if (deploymentTx) {
        await deploymentTx.wait(5);
    }

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const presaleInfo = await tokenPresale.getExtendedPresaleInfo();
    console.log("- Token Address:", presaleInfo.token);
    console.log("- USDC Address:", presaleInfo.usdc);
    console.log("- USDT Address:", presaleInfo.usdt);
    console.log("- Token Price:", presaleInfo.tokenPrice.toString());
    console.log("- Min Buy Limit:", ethers.formatUnits(presaleInfo.minBuyLimit, 6));
    console.log("- Max Buy Limit:", ethers.formatUnits(presaleInfo.maxBuyLimit, 6));
    console.log("- Total Tokens for Sale:", ethers.formatEther(presaleInfo.totalTokensForSale));
    console.log("- Is Active:", presaleInfo.isActive);

    // Contract verification on Arbiscan
    if (process.env.ARBISCAN_API_KEY) {
        console.log("\n🔐 Verifying contract on Arbiscan...");
        try {
            await hre.run("verify:verify", {
                address: await tokenPresale.getAddress(),
                constructorArguments: [
                    DEPLOYMENT_PARAMS.token,
                    DEPLOYMENT_PARAMS.usdc,
                    DEPLOYMENT_PARAMS.usdt,
                    DEPLOYMENT_PARAMS.tokenPrice,
                    DEPLOYMENT_PARAMS.minBuyLimit,
                    DEPLOYMENT_PARAMS.maxBuyLimit,
                    DEPLOYMENT_PARAMS.totalTokensForSale
                ],
            });
            console.log("✅ Contract verified on Arbiscan");
        } catch (error) {
            console.log("❌ Verification failed:", error.message);
        }
    }

    const contractAddress = await tokenPresale.getAddress();

    // Summary
    console.log("\n📊 Deployment Summary:");
    console.log("=====================================");
    console.log("Network: Arbitrum");
    console.log("TokenPresale Address:", contractAddress);
    console.log("MRL Token Address:", DEPLOYMENT_PARAMS.token);
    console.log("USDC Address:", DEPLOYMENT_PARAMS.usdc);
    console.log("USDT Address:", DEPLOYMENT_PARAMS.usdt);
    console.log("Price: 1 MRL = 0.04 USDC/USDT");
    console.log("Min Purchase: 100 USDC/USDT");
    console.log("Max Purchase: 500 USDC/USDT per user");
    console.log("Total Tokens for Sale:", ethers.formatEther(DEPLOYMENT_PARAMS.totalTokensForSale), "MRL");
    console.log("=====================================");

    console.log("\n🎯 Next Steps:");
    console.log("1. Transfer MRL tokens to the presale contract");
    console.log("2. Activate the presale using setPresaleStatus(true)");
    console.log("3. Set unlock percentages as needed");
    console.log("4. Monitor the presale progress");

    // Save deployment info to file
    const fs = require('fs');
    const deploymentInfo = {
        network: "arbitrum",
        tokenPresale: contractAddress,
        mrlToken: DEPLOYMENT_PARAMS.token,
        usdc: DEPLOYMENT_PARAMS.usdc,
        usdt: DEPLOYMENT_PARAMS.usdt,
        tokenPrice: DEPLOYMENT_PARAMS.tokenPrice,
        minBuyLimit: DEPLOYMENT_PARAMS.minBuyLimit.toString(),
        maxBuyLimit: DEPLOYMENT_PARAMS.maxBuyLimit.toString(),
        totalTokensForSale: DEPLOYMENT_PARAMS.totalTokensForSale.toString(),
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        'deployment-arbitrum.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n💾 Deployment info saved to deployment-arbitrum.json");
}

// Function to deploy a mock MRL token for testing
async function deployMockMRL() {
    console.log("\n🪙 Deploying Mock MRL Token for testing...");
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mrlToken = await MockERC20.deploy(
        "Merlin Token",
        "MRL",
        18 // decimals
    );
    
    await mrlToken.waitForDeployment();
    console.log("✅ Mock MRL Token deployed to:", await mrlToken.getAddress());
    
    return await mrlToken.getAddress();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = { main, deployMockMRL }; 