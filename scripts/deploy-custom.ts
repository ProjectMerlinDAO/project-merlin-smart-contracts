import {ethers} from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying Bridge...");
    const tokenManagerAddress = "0x0B3547CD0E14e7D42f8921b0c370FdFD708bff6C"
    const oracleAddress = "0x27C0Eb7Ba9c334d0740Ff529589bd89007398883";

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