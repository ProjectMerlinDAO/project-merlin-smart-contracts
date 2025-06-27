# Contract Verification Guide

This guide explains how to verify your TokenManager contract on Arbiscan.

## Prerequisites

1. Make sure you have the following in your `.env` file:
   ```
   ARBISCAN_API_KEY=your_arbiscan_api_key
   TOKEN_MANAGER_ADDRESS=your_deployed_contract_address
   ```

2. Optionally, you can also specify this parameter in your `.env` file:
   ```
   TOTAL_SUPPLY=800000000
   ```
   If not provided, the script will use this default value.

## Verifying Your Contract

### For Arbitrum One (Mainnet)

```bash
npm run verify-token-manager:mainnet
```

### For Arbitrum Sepolia (Testnet)

```bash
npm run verify-token-manager:testnet
```

## Manual Verification

If the automatic verification fails, you can try verifying manually:

```bash
npx hardhat verify --network arbitrumOne YOUR_CONTRACT_ADDRESS "Merlin" "MRLN" 800000000000000000000000000
```

Replace `YOUR_CONTRACT_ADDRESS` with your actual contract address, and adjust the constructor arguments if your contract was deployed with different values.

## Contract Details

Based on your deployment information:

- **TokenManager**: 0x0B3547CD0E14e7D42f8921b0c370FdFD708bff6C
- **TokenPresale**: 0x120f79BfAFEb647bde171630B06b926ac4C35ceD
- **USDC Address**: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
- **USDT Address**: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
- **Token Price**: $0.04 USDC/USDT
- **Min Buy**: $100.0 USDC/USDT
- **Max Buy**: $10000.0 USDC/USDT
- **Total Tokens for Sale**: 10000000.0 MRLN

## Troubleshooting

1. **"Already Verified" Error**: This means your contract is already verified on Arbiscan.

2. **API Key Error**: Check that your ARBISCAN_API_KEY is correct in your .env file.

3. **Constructor Arguments Error**: If you're getting errors about constructor arguments, you may need to provide the exact values that were used during deployment.

4. **Network Error**: Make sure you're verifying on the correct network where your contract is deployed. 