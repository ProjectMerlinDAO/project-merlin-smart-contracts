import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy mock tokens for testing
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  
  // Deploy mock token (18 decimals)
  const mockToken = await MockERC20Factory.deploy("Test Token", "TT", 18);
  await mockToken.waitForDeployment();
  console.log("Mock Token deployed to:", await mockToken.getAddress());
  
  // Deploy mock USDC (6 decimals)
  const mockUSDC = await MockERC20Factory.deploy("USD Coin", "USDC", 6);
  await mockUSDC.waitForDeployment();
  console.log("Mock USDC deployed to:", await mockUSDC.getAddress());

  // Deploy LotteryPresale Factory
  const LotteryPresaleFactory = await ethers.getContractFactory("LotteryPresale");

  // Example 1: Regular Presale (7 days duration)
  const regularPresaleParams = {
    token: await mockToken.getAddress(),
    paymentToken: await mockUSDC.getAddress(),
    tokenPrice: ethers.parseUnits("0.1", 6), // 0.1 USDC per token
    maxBuyLimit: ethers.parseUnits("10000", 18), // 10,000 tokens max per user
    presaleType: 0, // REGULAR
    duration: 7 * 24 * 60 * 60 // 7 days in seconds
  };

  const regularPresale = await LotteryPresaleFactory.deploy(
    regularPresaleParams.token,
    regularPresaleParams.paymentToken,
    regularPresaleParams.tokenPrice,
    regularPresaleParams.maxBuyLimit,
    regularPresaleParams.presaleType,
    regularPresaleParams.duration
  );
  await regularPresale.waitForDeployment();
  console.log("Regular Presale deployed to:", await regularPresale.getAddress());

  // Example 2: Lottery Presale (3 days duration)
  const lotteryPresaleParams = {
    token: await mockToken.getAddress(),
    paymentToken: await mockUSDC.getAddress(),
    tokenPrice: ethers.parseUnits("0.05", 6), // 0.05 USDC per token (cheaper for lottery)
    maxBuyLimit: ethers.parseUnits("200", 6), // 200 USDC max contribution per user
    presaleType: 1, // LOTTERY
    duration: 3 * 24 * 60 * 60 // 3 days in seconds
  };

  const lotteryPresale = await LotteryPresaleFactory.deploy(
    lotteryPresaleParams.token,
    lotteryPresaleParams.paymentToken,
    lotteryPresaleParams.tokenPrice,
    lotteryPresaleParams.maxBuyLimit,
    lotteryPresaleParams.presaleType,
    lotteryPresaleParams.duration
  );
  await lotteryPresale.waitForDeployment();
  console.log("Lottery Presale deployed to:", await lotteryPresale.getAddress());

  // Mint tokens to deployer
  const INITIAL_TOKEN_SUPPLY = ethers.parseUnits("1000000", 18); // 1M tokens
  await mockToken.mint(deployer.address, INITIAL_TOKEN_SUPPLY);
  console.log("Minted tokens to deployer");

  // Fund presale contracts with tokens
  const PRESALE_TOKEN_AMOUNT = ethers.parseUnits("100000", 18); // 100K tokens each
  
  // Fund regular presale
  await mockToken.approve(await regularPresale.getAddress(), PRESALE_TOKEN_AMOUNT);
  await regularPresale.addTokensToPresale(PRESALE_TOKEN_AMOUNT);
  console.log("Funded regular presale with tokens");

  // Fund lottery presale  
  await mockToken.approve(await lotteryPresale.getAddress(), PRESALE_TOKEN_AMOUNT);
  await lotteryPresale.addTokensToPresale(PRESALE_TOKEN_AMOUNT);
  console.log("Funded lottery presale with tokens");

  // Display deployment summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Mock Token:", await mockToken.getAddress());
  console.log("Mock USDC:", await mockUSDC.getAddress());
  console.log("Regular Presale:", await regularPresale.getAddress());
  console.log("Lottery Presale:", await lotteryPresale.getAddress());
  
  console.log("\n=== REGULAR PRESALE CONFIG ===");
  const regularInfo = await regularPresale.presaleInfo();
  console.log("Type: REGULAR");
  console.log("Token Price: 0.1 USDC");
  console.log("Max Buy Limit: 10,000 tokens");
  console.log("Duration: 7 days");
  console.log("End Time:", new Date(Number(regularInfo.endTime) * 1000).toLocaleString());
  
  console.log("\n=== LOTTERY PRESALE CONFIG ===");
  const lotteryInfo = await lotteryPresale.presaleInfo();
  console.log("Type: LOTTERY");
  console.log("Token Price: 0.05 USDC");
  console.log("Max Contribution: 200 USDC");
  console.log("Duration: 3 days");
  console.log("End Time:", new Date(Number(lotteryInfo.endTime) * 1000).toLocaleString());

  console.log("\n=== USAGE EXAMPLES ===");
  console.log("// Regular Presale - Direct token purchase");
  console.log(`// await mockUSDC.approve("${await regularPresale.getAddress()}", usdcAmount);`);
  console.log(`// await regularPresale.buyTokens(usdcAmount);`);
  
  console.log("\n// Lottery Presale - Participate in draw");
  console.log(`// await mockUSDC.approve("${await lotteryPresale.getAddress()}", usdcAmount);`);
  console.log(`// await lotteryPresale.participateInLottery(usdcAmount);`);
  console.log("// After presale ends:");
  console.log(`// await lotteryPresale.selectWinners([winner1, winner2]);`);
  console.log(`// await lotteryPresale.distributeTokensToWinners();`);
  console.log("// Winners can claim tokens, losers can claim refunds");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 