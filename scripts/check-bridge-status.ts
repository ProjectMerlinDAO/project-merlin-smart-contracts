import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Checking bridge status with account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get the Bridge cont"ract address from environment variable
  const bridgeAddress = "0xD8deDb14C828E9242c8a577F3A1919cf12db0823";
  if (!bridgeAddress) {
    throw new Error("BRIDGE_ADDRESS not set in environment");
  }

  // Get the Bridge contract
  const bridge = await ethers.getContractAt([
    "function paused() view returns (bool)",
    "function tokenAddress() view returns (address)",
    "function offchainProcessor() view returns (address)"
  ], bridgeAddress);

  // Check if bridge is paused
  const isPaused = await bridge.paused();
  console.log("Bridge paused:", isPaused);

  // Get token address
  const tokenAddress = await bridge.tokenAddress();
  console.log("Token address:", tokenAddress);

  // Get current offchain processor
  const processor = await bridge.offchainProcessor();
  console.log("Offchain processor:", processor);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 