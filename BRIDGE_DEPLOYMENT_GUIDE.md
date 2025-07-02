# 🌉 Bridge Contract Deployment Guide

This guide will help you deploy bridge contracts to both Arbitrum and BNB Chain networks.

## Prerequisites

### 1. Environment Setup

Create a `.env` file in the `smart-contracts` directory with the following variables:

```bash
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# API Keys for contract verification
ARBISCAN_API_KEY=your_arbiscan_api_key
BSCSCAN_API_KEY=your_bscscan_api_key

# Optional: Custom RPC URLs (if you want to use your own endpoints)
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BSC_RPC_URL=https://bsc-dataseed1.binance.org

# For testnet deployments
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

### 2. Get API Keys

- **Arbiscan API Key**: Visit [arbiscan.io/apis](https://arbiscan.io/apis)
- **BscScan API Key**: Visit [bscscan.com/apis](https://bscscan.com/apis)

### 3. Fund Your Wallet

Ensure your deployment wallet has sufficient native tokens:
- **Arbitrum One**: ETH (at least 0.1 ETH)
- **BNB Chain**: BNB (at least 0.1 BNB)
- **Testnets**: Get free tokens from faucets

## Deployment Options

### Option 1: Deploy to Specific Networks (Recommended)

#### Deploy to Arbitrum One (Mainnet)
```bash
cd smart-contracts
DEPLOY_TYPE=bridge npx hardhat run scripts/deploy-unified.ts --network arbitrumOne
```

#### Deploy to BNB Chain (Mainnet)
```bash
cd smart-contracts
DEPLOY_TYPE=bridge npx hardhat run scripts/deploy-unified.ts --network bsc
```

#### Deploy to Arbitrum Sepolia (Testnet)
```bash
cd smart-contracts
DEPLOY_TYPE=bridge npx hardhat run scripts/deploy-unified.ts --network arbitrumSepolia
```

#### Deploy to BSC Testnet
```bash
cd smart-contracts
DEPLOY_TYPE=bridge npx hardhat run scripts/deploy-unified.ts --network bscTestnet
```

### Option 2: Deploy to Multiple Networks at Once

#### Deploy to All Mainnet Networks
```bash
cd smart-contracts
chmod +x scripts/deploy-bridges.sh
./scripts/deploy-bridges.sh mainnet
```

#### Deploy to All Testnet Networks
```bash
cd smart-contracts
chmod +x scripts/deploy-bridges.sh
./scripts/deploy-bridges.sh testnet
```

#### Deploy to All Networks (Testnet + Mainnet)
```bash
cd smart-contracts
chmod +x scripts/deploy-bridges.sh
./scripts/deploy-bridges.sh all
```

## What Gets Deployed

The bridge deployment will create the following contracts on each network:

1. **TokenManager** - ERC20 token with bridge functionality
2. **Bridge** - Cross-chain bridge contract
3. **Oracle** - Price oracle for bridge operations

### Contract Configuration

Each network deployment uses these parameters:
- **Token Name**: "Merlin"
- **Token Symbol**: "MRLN" 
- **Total Supply**: 800,000,000 tokens
- **Bridge Amount**: 100,000,000 tokens
- **Transfer Fee**: 1% (100 basis points)
- **Operation Fee**: 1 MRLN token

## Expected Output

After successful deployment, you'll see output like this:

```
Deploying contracts with the account: 0x...
Deploying on network: 42161 (arbitrumOne)
Deployment salt: 42161-1234567890
Using configuration for: Arbitrum One
Using token name: Merlin-42161
Using token symbol: MRLN1234
Deploying Bridge contracts...
TokenManager deployed to: 0x...
Bridge deployed to: 0x...
Oracle deployed to: 0x...
```

## Verification

Contracts will be automatically verified on the respective block explorers if you have the correct API keys configured.

## Troubleshooting

### Common Issues

1. **"Insufficient funds for gas"**
   - Ensure your wallet has enough native tokens (ETH/BNB)

2. **"Network connection failed"**
   - Check your internet connection
   - Try using custom RPC URLs in your .env file

3. **"API key not found"**
   - Make sure you have the correct API keys in your .env file
   - Verification will fail but deployment will still succeed

4. **"Contract already exists"**
   - The deployment script uses unique salts to avoid conflicts
   - Each deployment creates unique contracts

### Gas Optimization

- **Arbitrum**: Generally low gas costs
- **BNB Chain**: Moderate gas costs, consider deploying during off-peak hours

## Post-Deployment Steps

After successful deployment:

1. **Save Contract Addresses**: Record all deployed contract addresses
2. **Verify Contracts**: Ensure all contracts are verified on block explorers
3. **Test Bridge Functionality**: Perform test transactions
4. **Configure Frontend**: Update your frontend with new contract addresses
5. **Set Up Monitoring**: Monitor contract events and transactions

## Network Information

### Arbitrum One
- **Chain ID**: 42161
- **Block Explorer**: https://arbiscan.io
- **RPC URL**: https://arb1.arbitrum.io/rpc

### BNB Chain
- **Chain ID**: 56
- **Block Explorer**: https://bscscan.com
- **RPC URL**: https://bsc-dataseed1.binance.org

### Arbitrum Sepolia (Testnet)
- **Chain ID**: 421614
- **Block Explorer**: https://sepolia.arbiscan.io
- **RPC URL**: https://sepolia-rollup.arbitrum.io/rpc
- **Faucet**: https://faucet.quicknode.com/arbitrum/sepolia

### BSC Testnet
- **Chain ID**: 97
- **Block Explorer**: https://testnet.bscscan.com
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545
- **Faucet**: https://testnet.bnbchain.org/faucet-smart

## Security Considerations

- **Private Key Security**: Never commit your private key to version control
- **Testnet First**: Always test on testnets before mainnet deployment
- **Contract Verification**: Always verify contracts on block explorers
- **Access Control**: Ensure proper access control is set up post-deployment

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the deployment logs for specific error messages
3. Ensure all prerequisites are met
4. Test on testnets first before mainnet deployment 