import {ethers} from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying Bridge...");
    const tokenManagerAddress = "0x64f9dB0942949d675Ffd694b840F509457Dc7bE2"
    const oracleAddress = "0xcF632eAb35B4885C0f87D14cce44F574eACABFFb";

    const BridgeFactory = await ethers.getContractFactory("Bridge");

    const transferFee = 5; // 1% (100 basis points)
    const operationFee = ethers.parseEther("1"); // 1 MRLN

    const bridge = await BridgeFactory.deploy(
        tokenManagerAddress,
        transferFee,
        operationFee,
        oracleAddress,
        deployer.address // offchain processor initially set to deployer
    );

    await bridge.waitForDeployment();
    const bridgeAddress = await bridge.getAddress();
    console.log("Bridge deployed to:", bridgeAddress);
}


main().catch(console.error)