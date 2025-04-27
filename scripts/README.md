# ProjectMerlin Deployment Scripts

This directory contains deployment scripts for the ProjectMerlin ecosystem smart contracts. These scripts are designed to deploy the contracts to various networks, including Arbitrum, Base, Optimism, and Linea (both mainnet and testnet versions).

## Prerequisites

Before running the deployment scripts, make sure you have:

1. Set up your environment variables in a `.env` file:
   ```
   PRIVATE_KEY=your_private_key_here
   INFURA_API_KEY=your_infura_api_key
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ARBISCAN_API_KEY=your_arbiscan_api_key
   BASESCAN_API_KEY=your_basescan_api_key
   OPTIMISTIC_API_KEY=your_optimistic_api_key
   LINEASCAN_API_KEY=your_lineascan_api_key
   ```

2. Installed all required dependencies:
   ```
   npm install
   ```

## Deployment Options

There are two main deployment types:

1. **Bridge Deployment** - Deploys the bridge infrastructure (TokenManager, Bridge, and Oracle)
2. **DAO Deployment** - Deploys the ProjectDAO ecosystem (TokenManager, CommunityNFT, ProjectDAO, ProjectInvestment)

### Deployment Scripts

- `deploy-unified.ts` - Main unified deployment script that can deploy either bridge or DAO contracts
- `deploy-config.ts` - Configuration for different networks
- `utils.ts` - Utility functions used by the deployment scripts

## How to Deploy

### Deploy Bridge Contracts to Arbitrum

```bash
# Deploy to Arbitrum testnet (Sepolia)
DEPLOY_TYPE=bridge npx hardhat run scripts/deploy-unified.ts --network arbitrumSepolia

# Deploy to Arbitrum mainnet
DEPLOY_TYPE=bridge npx hardhat run scripts/deploy-unified.ts --network arbitrumOne
```

### Deploy DAO Contracts to Arbitrum

```bash
# Deploy to Arbitrum testnet (Sepolia)
DEPLOY_TYPE=dao npx hardhat run scripts/deploy-unified.ts --network arbitrumSepolia

# Deploy to Arbitrum mainnet
DEPLOY_TYPE=dao npx hardhat run scripts/deploy-unified.ts --network arbitrumOne
```

### Deploy to Other Supported Networks

The deployment scripts support the following networks:

**Mainnet:**
- Arbitrum One: `--network arbitrumOne`
- Base: `--network base`
- Optimism: `--network optimism`
- Linea: `--network linea`

**Testnet:**
- Arbitrum Goerli: `--network arbitrumGoerli`
- Arbitrum Sepolia: `--network arbitrumSepolia`
- Base Goerli: `--network baseGoerli`
- Base Sepolia: `--network baseSepolia`
- Optimism Goerli: `--network optimismGoerli`
- Optimism Sepolia: `--network optimismSepolia`
- Linea Goerli: `--network lineaGoerli`
- Linea Sepolia: `--network lineaTestnet`

## Verification

The deployment scripts will automatically attempt to verify the contracts on the respective block explorers if you've provided the appropriate API keys in your `.env` file.

## Contract Addresses

After deployment, the script will log the addresses of all deployed contracts. Make sure to save these addresses for future reference. 