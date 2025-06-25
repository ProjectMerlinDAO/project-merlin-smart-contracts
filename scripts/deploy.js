const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy TokenManager
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy(
    "Merlin",
    "MRLN",
    ethers.parseEther("800000000") // Total supply
  );
  await tokenManager.waitForDeployment();
  console.log("TokenManager deployed to:", await tokenManager.getAddress());

  // Deploy ProjectInvestment
  const ProjectInvestment = await ethers.getContractFactory("ProjectInvestment");
  const projectInvestment = await ProjectInvestment.deploy(
    await tokenManager.getAddress(),
    ethers.parseEther("1000") // Target amount: 1000 MRLN
  );
  await projectInvestment.waitForDeployment();
  console.log("ProjectInvestment deployed to:", await projectInvestment.getAddress());

  // Verify contracts on Etherscan
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await tokenManager.deployTransaction.wait(6);
    await projectInvestment.deployTransaction.wait(6);

    await hre.run("verify:verify", {
      address: await tokenManager.getAddress(),
      constructorArguments: [
        "Merlin",
        "MRLN",
        ethers.parseEther("800000000")
      ],
    });

    await hre.run("verify:verify", {
      address: await projectInvestment.getAddress(),
      constructorArguments: [
        await tokenManager.getAddress(),
        ethers.parseEther("1000")
      ],
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 