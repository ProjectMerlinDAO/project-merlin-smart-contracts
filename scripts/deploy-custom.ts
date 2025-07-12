import {ethers} from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying ProjectDAO ecosystem with the account:", deployer.address);

    const TokenManagerFactory = await ethers.getContractFactory("Oracle");
    const tokenManager = await TokenManagerFactory.deploy(
      "0xcF632eAb35B4885C0f87D14cce44F574eACABFFb"
    );
    await tokenManager.waitForDeployment();
    const tokenManagerAddress = await tokenManager.getAddress();
    console.log("TokenManager deployed to:", tokenManagerAddress);

}


main().catch(console.error)