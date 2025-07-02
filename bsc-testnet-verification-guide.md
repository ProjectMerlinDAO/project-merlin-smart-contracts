# BSC Testnet Contract Verification Guide

This guide explains how to manually verify your deployed contracts on **BSC Testnet** using BSCScan.

## Deployed Contract Addresses (BSC Testnet)

- **Oracle**: `0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9`
- **TokenManager**: `0xa64D0bCB4b6325C1ed68749727eA544366cca30e`
- **Bridge**: `0xf42Bd569fffAE367716412D0C8d3605c204390c2`

## Manual Verification Steps

### 1. Oracle Contract Verification

1. Go to [BSCScan Testnet](https://testnet.bscscan.com/)
2. Navigate to: `https://testnet.bscscan.com/address/0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9`
3. Click on the **"Contract"** tab
4. Click **"Verify and Publish"**
5. Fill in the verification form:

**Contract Details:**
- **Contract Address**: `0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9`
- **Contract Name**: `Oracle`
- **Compiler Type**: `Solidity (Single file)`
- **Compiler Version**: `v0.8.19+commit.7dd6d404`
- **Open Source License Type**: `MIT License (MIT)`

**Source Code:**
```solidity
// Copy the entire Oracle.sol contract source code here
// You can find it in: smart-contracts/contracts/Oracle.sol
```

**Constructor Arguments ABI-encoded:**
```
0000000000000000000000005c3c97ea087024f91eb11d5659f1b5a3b911e971
```

**Optimization:**
- **Optimization**: `Yes`
- **Runs**: `200`

### 2. TokenManager Contract Verification

1. Go to: `https://testnet.bscscan.com/address/0xa64D0bCB4b6325C1ed68749727eA544366cca30e`
2. Click on the **"Contract"** tab
3. Click **"Verify and Publish"**
4. Fill in the verification form:

**Contract Details:**
- **Contract Address**: `0xa64D0bCB4b6325C1ed68749727eA544366cca30e`
- **Contract Name**: `TokenManager`
- **Compiler Type**: `Solidity (Single file)`
- **Compiler Version**: `v0.8.19+commit.7dd6d404`
- **Open Source License Type**: `MIT License (MIT)`

**Source Code:**
```solidity
// Copy the entire TokenManager.sol contract source code here
// You can find it in: smart-contracts/contracts/TokenManager.sol
```

**Constructor Arguments ABI-encoded:**
```
00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000295be96e64066972000000000000000000000000000000000000000000000000000000000000000000094d65726c696e2d393700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084d524c4e3337313400000000000000000000000000000000000000000000000
```

**Optimization:**
- **Optimization**: `Yes`
- **Runs**: `200`

### 3. Bridge Contract Verification

1. Go to: `https://testnet.bscscan.com/address/0xf42Bd569fffAE367716412D0C8d3605c204390c2`
2. Click on the **"Contract"** tab
3. Click **"Verify and Publish"**
4. Fill in the verification form:

**Contract Details:**
- **Contract Address**: `0xf42Bd569fffAE367716412D0C8d3605c204390c2`
- **Contract Name**: `Bridge`
- **Compiler Type**: `Solidity (Single file)`
- **Compiler Version**: `v0.8.19+commit.7dd6d404`
- **Open Source License Type**: `MIT License (MIT)`

**Source Code:**
```solidity
// Copy the entire Bridge.sol contract source code here
// You can find it in: smart-contracts/contracts/Bridge.sol
```

**Constructor Arguments ABI-encoded:**
```
000000000000000000000000a64d0bcb4b6325c1ed68749727ea544366cca30e00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000700e76c4dee9aa1a36b2ac1abe541615d42aabb90000000000000000000000005c3c97ea087024f91eb11d5659f1b5a3b911e971
```

**Optimization:**
- **Optimization**: `Yes`
- **Runs**: `200`

## Constructor Arguments Breakdown

### Oracle Constructor Arguments:
- `owner`: `0x5c3C97Ea087024f91EB11d5659F1B5A3b911E971` (deployer address)

### TokenManager Constructor Arguments:
- `name`: `"Merlin-97"` (string)
- `symbol`: `"MRLN3714"` (string)  
- `totalSupply`: `800000000000000000000000000` (800M tokens with 18 decimals)

### Bridge Constructor Arguments:
- `tokenAddress`: `0xa64D0bCB4b6325C1ed68749727eA544366cca30e` (TokenManager address)
- `transferFee`: `100` (1% = 100 basis points)
- `operationFee`: `1000000000000000000` (1 token with 18 decimals)
- `oracle`: `0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9` (Oracle address)
- `offchainProcessor`: `0x5c3C97Ea087024f91EB11d5659F1B5A3b911E971` (deployer address)

## Important Notes

1. **Network**: Make sure you're on **BSC Testnet** (testnet.bscscan.com), not mainnet
2. **Compiler Version**: Use exactly `v0.8.19+commit.7dd6d404`
3. **Optimization**: Must be enabled with 200 runs (same as deployment)
4. **Source Code**: Must include all imports and dependencies in a single file
5. **Constructor Arguments**: Must be exactly as provided above (ABI-encoded)

## Verification Status Check

After submitting each contract for verification:

1. Wait 1-2 minutes for processing
2. Refresh the contract page
3. Look for a green ✅ checkmark next to "Contract" tab
4. You should see "Contract Source Code Verified" message

## Troubleshooting

**Common Issues:**
- **Compiler Version Mismatch**: Ensure you use `v0.8.19+commit.7dd6d404`
- **Constructor Arguments Error**: Double-check the ABI-encoded arguments
- **Source Code Issues**: Make sure all imports are included in single file
- **Optimization Settings**: Must match deployment settings (enabled, 200 runs)

**If Verification Fails:**
1. Check the exact error message
2. Verify compiler version matches deployment
3. Ensure constructor arguments are correct
4. Try again with single-file source code format

## Quick Links

- **Oracle Contract**: https://testnet.bscscan.com/address/0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9
- **TokenManager Contract**: https://testnet.bscscan.com/address/0xa64D0bCB4b6325C1ed68749727eA544366cca30e
- **Bridge Contract**: https://testnet.bscscan.com/address/0xf42Bd569fffAE367716412D0C8d3605c204390c2
- **BSCScan Testnet**: https://testnet.bscscan.com/

## After Verification

Once all contracts are verified, you'll be able to:
- Read contract state directly on BSCScan
- Interact with contracts through BSCScan's web interface
- View all contract functions and their parameters
- See contract source code and constructor arguments
- Monitor contract events and transactions

The verification will make your contracts publicly auditable and easier to interact with on BSC Testnet. 