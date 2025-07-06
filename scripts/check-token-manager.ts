import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Checking TokenManager status with account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get the TokenManager address from the bridge
  const bridgeAddress = process.env.BRIDGE_ADDRESS;
  if (!bridgeAddress) {
    throw new Error("BRIDGE_ADDRESS not set in environment");
  }

  // Get the Bridge contract
  const bridge = await ethers.getContractAt([
    "function tokenAddress() view returns (address)"
  ], bridgeAddress);

  // Get token address
  const tokenAddress = await bridge.tokenAddress();
  console.log("Token address:", tokenAddress);

  // Get the TokenManager contract
  const tokenManager = await ethers.getContractAt([
    "function bridge() view returns (address)",
    "function oracle() view returns (address)",
    "function owner() view returns (address)"
  ], tokenAddress);

  // Check TokenManager configuration
  const tmBridge = await tokenManager.bridge();
  const tmOracle = await tokenManager.oracle();
  const tmOwner = await tokenManager.owner();

  console.log("TokenManager bridge:", tmBridge);
  console.log("TokenManager oracle:", tmOracle);
  console.log("TokenManager owner:", tmOwner);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 