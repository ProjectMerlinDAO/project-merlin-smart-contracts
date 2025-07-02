# Manual BSC Contract Verification Guide

Since the automated verification is failing with the BSC API key, here are the manual verification steps:

## BSC Testnet Contracts (Latest Deployment)

### Contract Addresses:
- **Oracle**: `0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9`
- **TokenManager**: `0xa64D0bCB4b6325C1ed68749727eA544366cca30e`
- **Bridge**: `0xf42Bd569fffAE367716412D0C8d3605c204390c2`

## Manual Verification Steps

### 1. Oracle Contract
- **Address**: `0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9`
- **Constructor Arguments**: `0x5c3C97Ea087024f91EB11d5659F1B5A3b911E971`
- **Verification URL**: https://testnet.bscscan.com/verifyContract

**Steps:**
1. Go to https://testnet.bscscan.com/address/0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9
2. Click "Contract" tab
3. Click "Verify and Publish"
4. Select "Solidity (Single file)"
5. Compiler version: `v0.8.19+commit.7dd6d404`
6. License: MIT
7. Copy the Oracle.sol source code
8. Constructor Arguments (ABI encoded): `0000000000000000000000005c3c97ea087024f91eb11d5659f1b5a3b911e971`

### 2. TokenManager Contract
- **Address**: `0xa64D0bCB4b6325C1ed68749727eA544366cca30e`
- **Constructor Arguments**: 
  - `"Merlin-97"`
  - `"MRLN3714"`
  - `"800000000000000000000000000"`
- **Verification URL**: https://testnet.bscscan.com/verifyContract

**Steps:**
1. Go to https://testnet.bscscan.com/address/0xa64D0bCB4b6325C1ed68749727eA544366cca30e
2. Click "Contract" tab
3. Click "Verify and Publish"
4. Select "Solidity (Single file)"
5. Compiler version: `v0.8.19+commit.7dd6d404`
6. License: MIT
7. Copy the TokenManager.sol source code
8. Constructor Arguments (ABI encoded): Use the online ABI encoder with the values above

### 3. Bridge Contract
- **Address**: `0xf42Bd569fffAE367716412D0C8d3605c204390c2`
- **Constructor Arguments**:
  - `0xa64D0bCB4b6325C1ed68749727eA544366cca30e` (TokenManager)
  - `100` (transferFee)
  - `1000000000000000000` (operationFee - 1 ETH in wei)
  - `0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9` (Oracle)
  - `0x5c3C97Ea087024f91EB11d5659F1B5A3b911E971` (deployer)

## Alternative: Use BSCScan API Directly

If you want to try the API verification directly, you can use curl:

```bash
# Oracle verification
curl -d "module=contract&action=verifysourcecode&contractaddress=0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9&sourceCode=SOURCE_CODE_HERE&contractname=Oracle&compilerversion=v0.8.19+commit.7dd6d404&optimizationUsed=0&runs=200&constructorArguements=0000000000000000000000005c3c97ea087024f91eb11d5659f1b5a3b911e971&apikey=YOUR_API_KEY" https://api-testnet.bscscan.com/api
```

## Troubleshooting BSC API Key

If the API key continues to fail:

1. **Generate a new API key**:
   - Go to https://bscscan.com/apis
   - Create a new API key
   - Wait 5-10 minutes for it to become active

2. **Check API key format**:
   - BSC API keys are typically 34 characters long
   - Format: `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

3. **Test the API key**:
   ```bash
   curl "https://api-testnet.bscscan.com/api?module=stats&action=ethsupply&apikey=YOUR_API_KEY"
   ```

## Contract Source Code Locations

You can find the source code for verification at:
- Oracle: `smart-contracts/contracts/Oracle.sol`
- TokenManager: `smart-contracts/contracts/TokenManager.sol`
- Bridge: `smart-contracts/contracts/Bridge.sol`

## Success Confirmation

Once verified, you should see:
- ✅ Green checkmark on BSCScan
- "Contract Source Code Verified" message
- Ability to interact with contract functions on BSCScan 