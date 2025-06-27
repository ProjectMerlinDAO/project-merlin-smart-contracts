const hre = require("hardhat");
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

  // Connect to the TokenPresale contract
  const TokenPresale = await ethers.getContractFactory("TokenPresale");
  const tokenPresale = TokenPresale.attach(presaleAddress);

  // Get the current signer
  const [newOwner] = await ethers.getSigners();
  console.log("Accepting ownership with the account:", newOwner.address);

  // Get current owner and pending owner
  const currentOwner = await tokenPresale.owner();
  console.log("Current owner:", currentOwner);

  let pendingOwner;
  try {
    pendingOwner = await tokenPresale.pendingOwner();
    console.log("Pending owner:", pendingOwner);
  } catch (error) {
    console.error("Error: This contract may not use Ownable2Step or pendingOwner is not accessible");
    process.exit(1);
  }

  // Check if the signer is the pending owner
  if (pendingOwner.toLowerCase() !== newOwner.address.toLowerCase()) {
    console.error("Error: You are not the pending owner of the presale contract");
    console.log(`The pending owner is: ${pendingOwner}`);
    process.exit(1);
  }

  // Accept ownership
  console.log("Accepting ownership...");
  const tx = await tokenPresale.acceptOwnership();
  await tx.wait();
  console.log(`Ownership accepted! Transaction hash: ${tx.hash}`);

  // Verify that ownership transfer was successful
  const newCurrentOwner = await tokenPresale.owner();
  if (newCurrentOwner.toLowerCase() === newOwner.address.toLowerCase()) {
    console.log(`Success! You (${newOwner.address}) are now the owner of the presale contract.`);
  } else {
    console.error("Error: Ownership transfer verification failed.");
    console.log(`Expected new owner: ${newOwner.address}`);
    console.log(`Actual new owner: ${newCurrentOwner}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 