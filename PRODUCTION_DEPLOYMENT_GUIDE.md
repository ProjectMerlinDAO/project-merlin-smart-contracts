# 🚀 Production Deployment Guide - Project Merlin

This guide will help you deploy the Project Merlin token and presale contracts to Arbitrum mainnet.

## 📋 Prerequisites

1. **Node.js and npm installed**
2. **Hardhat environment configured**
3. **Private key of deployment wallet** (CEO wallet)
4. **Arbitrum mainnet RPC URL**
5. **Sufficient ETH balance** for gas fees (~0.1 ETH recommended)
6. **Arbiscan API key** for contract verification

## ⚙️ Configuration Setup

### 1. Environment Variables

Create a `.env` file in the smart-contracts directory:

```bash
# Deployment wallet private key (KEEP SECURE!)
PRIVATE_KEY=your_private_key_here

# Arbitrum mainnet RPC URL
ARBITRUM_MAINNET_RPC=https://arb1.arbitrum.io/rpc

# Arbiscan API key for contract verification
ARBISCAN_API_KEY=your_arbiscan_api_key_here
```

### 2. Hardhat Configuration

Ensure your `hardhat.config.ts` includes both Arbitrum networks:

```typescript
networks: {
  arbitrumOne: {
    url: process.env.ARBITRUM_MAINNET_RPC || "https://arb1.arbitrum.io/rpc",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 42161
  },
  arbitrumSepolia: {
    url: process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 421614
  }
}
```

### 3. Network Diagnosis

If you encounter chain ID mismatch errors, run the network diagnosis:

```bash
npx hardhat run scripts/check-network.ts --network arbitrumOne
npx hardhat run scripts/check-network.ts --network arbitrumSepolia
```

## 🎯 Presale Configuration

**IMPORTANT**: Before deployment, review and modify the presale parameters in `scripts/deploy-production.ts`:

```typescript
const PRESALE_CONFIG = {
  tokenPrice: "50000", // 0.05 USDC per token
  minBuyLimit: "100000000", // $100 minimum purchase
  maxBuyLimit: "10000000000", // $10,000 maximum purchase per user
  totalTokensForSale: "50000000" // 50M tokens for presale (MODIFY THIS)
};
```

### Key Parameters to Configure:

- **`totalTokensForSale`**: Number of MRLN tokens allocated for presale
- **`tokenPrice`**: Price per token in USDC (6 decimals, so 50000 = $0.05)
- **`minBuyLimit`**: Minimum purchase amount in USDC (6 decimals)
- **`maxBuyLimit`**: Maximum purchase per user in USDC (6 decimals)

## 🚀 Deployment Steps

### Step 1: Install Dependencies

```bash
cd smart-contracts
npm install
```

### Step 2: Compile Contracts

```bash
npx hardhat compile
```

### Step 3: Test Deployment (Optional)

Test on Arbitrum Sepolia testnet first:

```bash
npx hardhat run scripts/deploy-production.ts --network arbitrumSepolia
```

### Step 4: Production Deployment

**⚠️ FINAL DEPLOYMENT - MAINNET**

```bash
npx hardhat run scripts/deploy-production.ts --network arbitrumOne
```

## 📊 What Gets Deployed

The deployment script will:

1. **Deploy TokenManager Contract**
   - Creates 800M MRLN tokens
   - Allocates 100M tokens to bridge
   - Remaining 700M tokens go to CEO wallet
   - Automatically deploys Bridge and Oracle contracts

2. **Deploy TokenPresale Contract**
   - Configured with real USDC and USDT on Arbitrum
   - Ready to accept presale purchases
   - Tokens are transferred to presale contract

3. **Contract Verification**
   - All contracts verified on Arbiscan automatically

## 🎮 Post-Deployment Actions

### 1. Activate Presale (When Ready)

```bash
# First, update TOKENPRESALE_ADDRESS in activate-production-presale.ts
npx hardhat run scripts/activate-production-presale.ts --network arbitrumOne
```

### 2. Monitor Presale

Check presale status on Arbiscan using the deployed contract addresses.

### 3. Manage Token Unlock

Gradually release tokens to buyers:

```typescript
// Call on TokenPresale contract
setUnlockPercentage(2000) // 20% unlock
setUnlockPercentage(5000) // 50% unlock
setUnlockPercentage(10000) // 100% unlock (full release)
```

### 4. Withdraw Presale Funds

```typescript
// Withdraw USDC raised
withdrawUSDC(amount)

// Withdraw USDT raised  
withdrawPaymentToken(USDT_ADDRESS, amount)
```

## 📝 Token Distribution Summary

- **Total Supply**: 800,000,000 MRLN
- **Bridge Allocation**: 100,000,000 MRLN (12.5%)
- **Presale Allocation**: Configurable (e.g., 50,000,000 MRLN = 6.25%)
- **CEO Wallet**: Remaining tokens (e.g., 650,000,000 MRLN = 81.25%)

## 🔐 Security Checklist

- [ ] Private key stored securely
- [ ] .env file added to .gitignore
- [ ] Verified contract addresses before interaction
- [ ] Test deployment completed on testnet
- [ ] Presale parameters reviewed and confirmed
- [ ] Gas price and ETH balance checked

## 📞 Contract Addresses (Arbitrum Mainnet)

**Real Token Addresses Used:**
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- USDT: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`

**Your Deployed Contracts:** (Fill after deployment)
- TokenManager: `[ADDRESS_WILL_BE_SHOWN_AFTER_DEPLOYMENT]`
- TokenPresale: `[ADDRESS_WILL_BE_SHOWN_AFTER_DEPLOYMENT]`
- Bridge: `[ADDRESS_WILL_BE_SHOWN_AFTER_DEPLOYMENT]`
- Oracle: `[ADDRESS_WILL_BE_SHOWN_AFTER_DEPLOYMENT]`

## 🆘 Troubleshooting

### Common Issues:

1. **Chain ID Mismatch (HH101)**:
   ```
   HardhatError: HH101: Hardhat was set to use chain id 42161, but connected to a chain with id 421614
   ```
   **Solution**: You're connected to testnet but trying to deploy to mainnet (or vice versa)
   - For testnet: `npx hardhat run scripts/deploy-production.ts --network arbitrumSepolia`
   - For mainnet: `npx hardhat run scripts/deploy-production.ts --network arbitrumOne`
   - Run diagnosis: `npx hardhat run scripts/check-network.ts --network [network_name]`

2. **Insufficient gas**: Increase gas limit or gas price

3. **Private key error**: Check .env file format

4. **Network issues**: Verify RPC URL is working

5. **Contract verification failed**: Can be done manually on Arbiscan

### Support:

If you encounter issues, check:
- Hardhat console for error messages
- Arbiscan transaction details
- Network status (arbitrum.io)

## ✅ Success Confirmation

After successful deployment, you should have:

- [x] TokenManager deployed and verified
- [x] TokenPresale deployed and verified  
- [x] MRLN tokens in your wallet
- [x] Tokens transferred to presale contract
- [x] All contract addresses saved
- [x] Presale ready to activate

**🎉 Congratulations! Project Merlin is now live on Arbitrum!** 