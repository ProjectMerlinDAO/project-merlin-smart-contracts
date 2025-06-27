# Presale Deployment Guide

This guide explains how to deploy the TokenManager and TokenPresale contracts for Project Merlin.

## Prerequisites

1. Node.js and npm installed
2. Hardhat environment set up
3. Private key with sufficient funds on Arbitrum Sepolia (testnet) or Arbitrum One (mainnet)

## Environment Setup

Create a `.env` file in the `smart-contracts` directory with the following variables:

```
# Network RPC URLs
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_ONE_RPC_URL=https://arb1.arbitrum.io/rpc

# Private key for deployment (no 0x prefix)
PRIVATE_KEY=your_private_key_here

# Token addresses
# Arbitrum Sepolia (testnet)
USDC_TESTNET_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
USDT_TESTNET_ADDRESS=0xeBaF7A5aF4B9d2b0f1a7B5f5e8C2fBF278d14C49

# Arbitrum One (mainnet)
USDC_MAINNET_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
USDT_MAINNET_ADDRESS=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9

# Etherscan API key for verification
ARBISCAN_API_KEY=your_arbiscan_api_key

# For ownership transfer
PRESALE_ADDRESS=
NEW_OWNER_ADDRESS=
```

## Deployment Process

### 1. Testnet Deployment (Arbitrum Sepolia)

Run the following command to deploy to testnet:

```bash
npm run deploy-presale-testnet
```

This will:
- Deploy the TokenManager contract with the following parameters:
  - Name: "Merlin Token"
  - Symbol: "MRLN"
  - Total Supply: 800,000,000 MRLN
- Deploy the TokenPresale contract with the following parameters:
  - Token Price: $0.04 USDC/USDT
  - Min Buy: $100 USDC/USDT
  - Max Buy: $10,000 USDC/USDT
  - Total Tokens for Sale: 10,000,000 MRLN
- Fund the presale contract with the allocated tokens
- Save deployment information to `deployment-arbitrum-sepolia.json`

### 2. Mainnet Deployment (Arbitrum One)

Run the following command to deploy to mainnet:

```bash
npm run deploy-presale-mainnet
```

You will be prompted to confirm the mainnet deployment by typing 'confirm'.

### 3. Contract Verification

After deployment, you can verify the contracts on Arbiscan using the commands provided in the deployment output:

```bash
# For testnet
npx hardhat verify --network arbitrumSepolia <tokenManagerAddress> "Merlin Token" "MRLN" <totalSupply>
npx hardhat verify --network arbitrumSepolia <tokenPresaleAddress> <tokenManagerAddress> <usdcAddress> <usdtAddress> <tokenPrice> <minBuyLimit> <maxBuyLimit> <totalTokensForSale>

# For mainnet
npx hardhat verify --network arbitrumOne <tokenManagerAddress> "Merlin Token" "MRLN" <totalSupply>
npx hardhat verify --network arbitrumOne <tokenPresaleAddress> <tokenManagerAddress> <usdcAddress> <usdtAddress> <tokenPrice> <minBuyLimit> <maxBuyLimit> <totalTokensForSale>
```

## Presale Management

### Activating the Presale

After deployment, the presale is inactive by default. To activate it:

1. Update your `.env` file with the deployed presale address:
   ```
   PRESALE_ADDRESS=your_deployed_presale_address
   ```

2. Run the activation script:
   ```bash
   npm run activate-presale
   ```

### Transferring Ownership

To transfer ownership of the presale contract:

1. Update your `.env` file with the presale address and new owner address:
   ```
   PRESALE_ADDRESS=your_deployed_presale_address
   NEW_OWNER_ADDRESS=new_owner_address
   ```

2. Run the transfer ownership script:
   ```bash
   npm run transfer-presale-ownership
   ```

3. The new owner must accept ownership by running:
   ```bash
   npm run accept-presale-ownership
   ```
   Note: This must be run with the new owner's private key configured in the `.env` file.

## Bridge Deployment (Later Phase)

The Bridge and Oracle contracts will be deployed in a later phase, approximately one month after the presale. A separate deployment script will be provided for this purpose. 