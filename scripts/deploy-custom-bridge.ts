import {ethers} from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying Bridge...");
    const tokenManagerAddress = "0x79bE2B20389A869476d183b1f42B9950EAf457d8"
    const oracleAddress = "0x2660d1a622B7b683E3418dbfCcbBcDe30d05f48d";

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