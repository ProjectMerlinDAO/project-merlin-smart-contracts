import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  console.log("=".repeat(60));
  console.log("🔍 NETWORK DIAGNOSIS - PROJECT MERLIN");
  console.log("=".repeat(60));

  try {
    // Get network info from Hardhat config
    const hardhatNetwork = hre.network;
    console.log("Hardhat Network Name:", hardhatNetwork.name);
    console.log("Hardhat Network Config:", hardhatNetwork.config);

    // Get actual network info from provider
    const [signer] = await ethers.getSigners();
    const provider = ethers.provider;
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log("\n📊 NETWORK INFORMATION:");
    console.log("- Signer Address:", signer.address);
    console.log("- Network Name:", network.name);
    console.log("- Chain ID:", chainId);
    console.log("- Balance:", ethers.formatEther(await provider.getBalance(signer.address)), "ETH");

    // Check supported networks
    const supportedNetworks = {
      42161: "Arbitrum One (Mainnet)",
      421614: "Arbitrum Sepolia (Testnet)"
    };

    console.log("\n🌐 NETWORK STATUS:");
    if (supportedNetworks[chainId as keyof typeof supportedNetworks]) {
      console.log("✅ Supported network:", supportedNetworks[chainId as keyof typeof supportedNetworks]);
    } else {
      console.log("❌ Unsupported network. Chain ID:", chainId);
      console.log("Supported networks:");
      Object.entries(supportedNetworks).forEach(([id, name]) => {
        console.log(`  - ${id}: ${name}`);
      });
    }

    // Provide recommendations
    console.log("\n💡 RECOMMENDATIONS:");
    
    if (chainId === 421614) {
      console.log("🧪 You are on TESTNET (Arbitrum Sepolia)");
      console.log("- Good for testing deployment");
      console.log("- Uses test tokens (not real value)");
      console.log("- Deploy command: npx hardhat run scripts/deploy-production.ts --network arbitrumSepolia");
    } else if (chainId === 42161) {
      console.log("🚨 You are on MAINNET (Arbitrum One)");
      console.log("- This is PRODUCTION deployment");
      console.log("- Uses REAL tokens with REAL value");
      console.log("- Deploy command: npx hardhat run scripts/deploy-production.ts --network arbitrumOne");
    } else {
      console.log("❌ Unsupported network detected");
      console.log("Please switch to Arbitrum One or Arbitrum Sepolia");
    }

    console.log("\n🔧 HARDHAT CONFIGURATION CHECK:");
    
    // Check if hardhat.config has correct networks
    const expectedNetworks = ["arbitrumOne", "arbitrumSepolia"];
    console.log("Expected networks in hardhat.config:", expectedNetworks.join(", "));
    
    if (hardhatNetwork.name === "hardhat") {
      console.log("⚠️  You are using the default Hardhat network");
      console.log("Use --network flag to specify target network");
    }

  } catch (error) {
    console.error("❌ Error during network diagnosis:", error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎯 NETWORK DIAGNOSIS COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Diagnosis failed:", error);
    process.exit(1);
  }); 