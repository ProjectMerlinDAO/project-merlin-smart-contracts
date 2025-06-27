const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const presaleAddress = process.env.PRESALE_ADDRESS;
  const newOwnerAddress = process.env.NEW_OWNER_ADDRESS;

  if (!presaleAddress) {
    console.error("Please set PRESALE_ADDRESS in your .env file");
    process.exit(1);
  }

  if (!newOwnerAddress) {
    console.error("Please set NEW_OWNER_ADDRESS in your .env file");
    process.exit(1);
  }

  // Validate addresses
  if (!ethers.isAddress(presaleAddress)) {
    console.error("Invalid presale address:", presaleAddress);
    process.exit(1);
  }

  if (!ethers.isAddress(newOwnerAddress)) {
    console.error("Invalid new owner address:", newOwnerAddress);
    process.exit(1);
  }

  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (${network.chainId})`);

  // Connect to the TokenPresale contract
  const TokenPresale = await ethers.getContractFactory("TokenPresale");
  const tokenPresale = TokenPresale.attach(presaleAddress);

  // Get block explorer URL based on the network
  let explorerUrl;
  if (network.chainId === 1) {
    explorerUrl = "https://etherscan.io";
  } else if (network.chainId === 42161) {
    explorerUrl = "https://arbiscan.io";
  } else if (network.chainId === 421614) {
    explorerUrl = "https://sepolia.arbiscan.io";
  } else {
    explorerUrl = "the block explorer";
  }

  // Get the current signer
  const [deployer] = await ethers.getSigners();
  console.log("Transferring ownership with the account:", deployer.address);

  // Get current owner
  const currentOwner = await tokenPresale.owner();
  console.log("Current owner:", currentOwner);

  // Check if the deployer is the current owner
  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("Error: You are not the current owner of the presale contract");
    process.exit(1);
  }

  // Check if pending owner exists
  try {
    const pendingOwner = await tokenPresale.pendingOwner();
    if (pendingOwner !== ethers.ZeroAddress) {
      console.log("There is already a pending owner:", pendingOwner);
      console.log("Please cancel the pending transfer or have the pending owner accept/renounce it first");
      process.exit(1);
    }
  } catch (error) {
    // If pendingOwner() function doesn't exist, continue with the transfer
    console.log("No pendingOwner function found, proceeding with transfer...");
  }

  // Transfer ownership
  console.log(`Transferring ownership to ${newOwnerAddress}...`);
  const tx = await tokenPresale.transferOwnership(newOwnerAddress);
  await tx.wait();
  console.log(`Ownership transfer initiated! Transaction hash: ${tx.hash}`);

  console.log("\n=== IMPORTANT INSTRUCTIONS FOR NEW OWNER ===");
  console.log(`The new owner (${newOwnerAddress}) must accept ownership by calling acceptOwnership() on the contract.`);
  console.log("\nTo accept ownership, the new owner can:");
  console.log(`1. Use ${explorerUrl}/address/${presaleAddress}#writeContract to call the acceptOwnership() function`);
  console.log("2. Or run the following script:");
  console.log(`   npm run accept-presale-ownership`);
  console.log("\nUntil the new owner accepts, the current owner still has control of the contract.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 