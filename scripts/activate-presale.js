const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    const presaleAddress = process.env.PRESALE_ADDRESS;

    if (!presaleAddress) {
        console.error("Please set PRESALE_ADDRESS in your .env file");
        process.exit(1);
    }

    // Validate address
    if (!ethers.isAddress(presaleAddress)) {
        console.error("Invalid presale address:", presaleAddress);
        process.exit(1);
    }

    const [deployer] = await ethers.getSigners();
    console.log("Activating presale with the account:", deployer.address);
    
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (${network.chainId})`);

    // Connect to the TokenPresale contract
    const TokenPresale = await ethers.getContractFactory("TokenPresale");
    const tokenPresale = TokenPresale.attach(presaleAddress);

    // Check if presale is already active
    const isActive = (await tokenPresale.presaleInfo()).isActive;
    if (isActive) {
        console.log("Presale is already active!");
        process.exit(0);
    }

    // Activate presale
    console.log("Activating presale...");
    const tx = await tokenPresale.setPresaleStatus(true);
    await tx.wait();
    console.log(`Presale activated! Transaction hash: ${tx.hash}`);

    // Verify activation
    const presaleInfo = await tokenPresale.presaleInfo();
    console.log("\n=== PRESALE STATUS ===");
    console.log(`Active: ${presaleInfo.isActive}`);
    console.log(`Token Price: $${ethers.formatUnits(presaleInfo.tokenPrice, 6)} USDC/USDT`);
    console.log(`Min Buy: $${ethers.formatUnits(presaleInfo.minBuyLimit, 6)} USDC/USDT`);
    console.log(`Max Buy: $${ethers.formatUnits(presaleInfo.maxBuyLimit, 6)} USDC/USDT`);
    console.log(`Total Tokens for Sale: ${ethers.formatEther(presaleInfo.totalTokensForSale)} MRLN`);
    console.log(`Current Unlock Percentage: ${presaleInfo.currentUnlockPercentage / 100}%`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = { main }; 