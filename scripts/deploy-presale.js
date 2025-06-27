const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying presale contracts with the account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log(`Deploying on network: ${network.chainId}`);

  // Deploy TokenManager first
  console.log("Deploying TokenManager...");
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const tokenManager = await TokenManager.deploy(
    "Merlin",
    "MRLN",
    ethers.parseEther("800000000") // Total supply
  );
  await tokenManager.waitForDeployment();
  const tokenManagerAddress = await tokenManager.getAddress();
  console.log("TokenManager deployed to:", tokenManagerAddress);

  // Get USDC and USDT addresses from environment variables or deploy mock tokens
  let usdcAddress;
  let usdtAddress;
  
  if (network.chainId === 31337 || network.chainId === 1337) { // Local network
    console.log("Deploying mock USDC and USDT for local testing...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();
    usdcAddress = await mockUSDC.getAddress();
    
    const mockUSDT = await MockERC20.deploy("Tether USD", "USDT", 6);
    await mockUSDT.waitForDeployment();
    usdtAddress = await mockUSDT.getAddress();
    
    console.log("Mock USDC deployed to:", usdcAddress);
    console.log("Mock USDT deployed to:", usdtAddress);
    
    // Mint some test tokens
    await mockUSDC.mint(deployer.address, ethers.parseUnits("1000000", 6));
    await mockUSDT.mint(deployer.address, ethers.parseUnits("1000000", 6));
  } else {
    // Use environment variables for token addresses
    if (process.env.USDC_ADDRESS && process.env.USDT_ADDRESS) {
      usdcAddress = process.env.USDC_ADDRESS;
      usdtAddress = process.env.USDT_ADDRESS;
      console.log("Using USDC address from .env:", usdcAddress);
      console.log("Using USDT address from .env:", usdtAddress);
    } else {
      // Fallback to network-specific addresses if environment variables are not set
      if (network.chainId === 1) { // Ethereum mainnet
        usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
      } else if (network.chainId === 42161) { // Arbitrum One
        usdcAddress = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
        usdtAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
      } else {
        console.error("Please add USDC_ADDRESS and USDT_ADDRESS to your .env file");
        process.exit(1);
      }
    }
  }

  // Deploy TokenPresale
  console.log("Deploying TokenPresale...");
  const TokenPresale = await ethers.getContractFactory("TokenPresale");
  const tokenPresale = await TokenPresale.deploy(
    tokenManagerAddress,
    usdcAddress,
    usdtAddress,
    ethers.parseUnits("0.04", 6), // Token price: 0.04 USDC
    ethers.parseUnits("100", 6),  // Min buy: 100 USDC
    ethers.parseUnits("5000", 6), // Max buy: 5000 USDC
    ethers.parseEther("10000000") // 10M tokens for sale
  );
  await tokenPresale.waitForDeployment();
  const presaleAddress = await tokenPresale.getAddress();
  console.log("TokenPresale deployed to:", presaleAddress);

  // Fund the presale contract with tokens
  console.log("Funding presale contract with tokens...");
  const presaleTokenAmount = ethers.parseEther("10000000"); // 10M tokens
  await tokenManager.approve(presaleAddress, presaleTokenAmount);
  await tokenPresale.addTokensToPresale(presaleTokenAmount);
  console.log(`Transferred ${ethers.formatEther(presaleTokenAmount)} tokens to presale contract`);

  // Verify contracts on Etherscan
  if (network.chainId !== 31337 && network.chainId !== 1337) {
    try {
      console.log("Waiting for block confirmations...");
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds
      
      console.log("Verifying TokenManager...");
      await hre.run("verify:verify", {
        address: tokenManagerAddress,
        constructorArguments: [
          "Merlin",
          "MRLN",
          ethers.parseEther("800000000")
        ],
      });

      console.log("Verifying TokenPresale...");
      await hre.run("verify:verify", {
        address: presaleAddress,
        constructorArguments: [
          tokenManagerAddress,
          usdcAddress,
          usdtAddress,
          ethers.parseUnits("0.04", 6),
          ethers.parseUnits("100", 6),
          ethers.parseUnits("5000", 6),
          ethers.parseEther("10000000")
        ],
      });
      
      console.log("Verification complete!");
    } catch (error) {
      console.error("Verification error:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 