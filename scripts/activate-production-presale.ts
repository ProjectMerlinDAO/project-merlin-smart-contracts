import { ethers } from "hardhat";

// =============================================================================
// PRESALE ACTIVATION SCRIPT
// =============================================================================

// TODO: Replace with actual deployed TokenPresale address
const TOKENPRESALE_ADDRESS = "REPLACE_WITH_DEPLOYED_TOKENPRESALE_ADDRESS";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("=".repeat(60));
  console.log("🚀 ACTIVATING PRESALE - PROJECT MERLIN");
  console.log("=".repeat(60));
  console.log("Activating with account:", signer.address);

  // Connect to deployed TokenPresale contract
  const TokenPresale = await ethers.getContractFactory("TokenPresale");
  const tokenPresale = TokenPresale.attach(TOKENPRESALE_ADDRESS) as any;

  console.log("TokenPresale contract:", TOKENPRESALE_ADDRESS);

  // Check current presale status
  const isCurrentlyActive = await tokenPresale.isPresaleActive();
  console.log("Current presale status:", isCurrentlyActive ? "ACTIVE" : "INACTIVE");

  if (isCurrentlyActive) {
    console.log("✅ Presale is already active!");
    return;
  }

  // Activate presale
  console.log("🔄 Activating presale...");
  const tx = await tokenPresale.setPresaleStatus(true);
  await tx.wait();

  console.log("✅ Presale activated successfully!");
  
  // Verify activation
  const newStatus = await tokenPresale.isPresaleActive();
  console.log("New presale status:", newStatus ? "ACTIVE" : "INACTIVE");

  // Get presale info
  const presaleInfo = await tokenPresale.getExtendedPresaleInfo();
  console.log("\n📊 PRESALE INFORMATION:");
  console.log("- Token:", presaleInfo.token);
  console.log("- USDC:", presaleInfo.usdc);
  console.log("- USDT:", presaleInfo.usdt);
  console.log("- Token Price:", Number(presaleInfo.tokenPrice) / 1000000, "USDC per token");
  console.log("- Min Purchase:", Number(presaleInfo.minBuyLimit) / 1000000, "USDC");
  console.log("- Max Purchase:", Number(presaleInfo.maxBuyLimit) / 1000000, "USDC");
  console.log("- Total Tokens for Sale:", ethers.formatEther(presaleInfo.totalTokensForSale), "MRLN");
  console.log("- Current Unlock %:", Number(presaleInfo.currentUnlockPercentage) / 100, "%");

  console.log("\n" + "=".repeat(60));
  console.log("🎉 PRESALE IS NOW LIVE!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Activation failed:", error);
    process.exit(1);
  }); 