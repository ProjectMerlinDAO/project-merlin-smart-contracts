import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting offchain processor with account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);

  // The new offchain processor address
  const newProcessor = "0x5c3C97Ea087024f91EB11d5659F1B5A3b911E971";

  // Get the Bridge contract address from environment variable
  const bridgeAddress = "0xf6d07872b649aa364bbb758C03B5fA925378CB8C";
  if (!bridgeAddress) {
    throw new Error("BRIDGE_ADDRESS not set in environment");
  }

  // Get the Bridge contract
  const bridge = await ethers.getContractAt([
    "function owner() view returns (address)",
    "function offchainProcessor() view returns (address)"
  ], bridgeAddress);

  // Get current offchain processor
  const currentProcessor = await bridge.offchainProcessor();
  console.log("Current offchain processor:", currentProcessor);

  // Get the Oracle (owner) address
  const oracleAddress = await bridge.owner();
  console.log("Oracle address:", oracleAddress);

  // Connect to Oracle contract
  const oracle = await ethers.getContractAt([
    "function changeOffchainAddress(address) external payable"
  ], oracleAddress, deployer);
  console.log("Connected to Oracle contract");

  // Set the offchain processor through Oracle
  console.log("Setting offchain processor through Oracle...");
  const tx = await oracle.changeOffchainAddress(newProcessor);
  await tx.wait();
  console.log("Transaction hash:", tx.hash);

  // Verify the change
  const newOffchainProcessor = await bridge.offchainProcessor();
  console.log("New offchain processor set to:", newOffchainProcessor);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 