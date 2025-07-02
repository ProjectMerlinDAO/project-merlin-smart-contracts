# Manual Contract Verification Commands

Based on your latest BSC Testnet deployment, here are the exact verification commands:

## BSC Testnet Deployment (Latest)
- **TokenManager**: `0xa64D0bCB4b6325C1ed68749727eA544366cca30e`
- **Bridge**: `0xf42Bd569fffAE367716412D0C8d3605c204390c2`
- **Oracle**: `0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9`

### Verify Oracle Contract
```bash
npx hardhat verify --network bscTestnet 0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9 "0x5c3C97Ea087024f91EB11d5659F1B5A3b911E971"
```

### Verify TokenManager Contract
```bash
npx hardhat verify --network bscTestnet 0xa64D0bCB4b6325C1ed68749727eA544366cca30e "Merlin-97" "MRLN3714" "800000000000000000000000000"
```

### Verify Bridge Contract
```bash
npx hardhat verify --network bscTestnet 0xf42Bd569fffAE367716412D0C8d3605c204390c2 "0xa64D0bCB4b6325C1ed68749727eA544366cca30e" 100 "1000000000000000000" "0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9" "0x5c3C97Ea087024f91EB11d5659F1B5A3b911E971"
```

## Arbitrum Sepolia Deployment (Previous)
- **TokenManager**: `0xe3BFBF30CEe1E7EA2fFe1bff7d347564cEe0dbEB`
- **Bridge**: `0x12F457436C1654eF8512F8E948B5a282e6d8f00e`
- **Oracle**: `0xf208A52BaA5a4B61856d854F5b04DBa56Bfb9E92`

### Verify Oracle Contract
```bash
npx hardhat verify --network arbitrumSepolia 0xf208A52BaA5a4B61856d854F5b04DBa56Bfb9E92 "0x5c3C97Ea087024f91EB11d5659F1B5A3b911E971"
```

### Verify TokenManager Contract
```bash
npx hardhat verify --network arbitrumSepolia 0xe3BFBF30CEe1E7EA2fFe1bff7d347564cEe0dbEB "Merlin-421614" "MRLN3564" "800000000000000000000000000"
```

### Verify Bridge Contract
```bash
npx hardhat verify --network arbitrumSepolia 0x12F457436C1654eF8512F8E948B5a282e6d8f00e "0xe3BFBF30CEe1E7EA2fFe1bff7d347564cEe0dbEB" 100 "1000000000000000000" "0xf208A52BaA5a4B61856d854F5b04DBa56Bfb9E92" "0x5c3C97Ea087024f91EB11d5659F1B5A3b911E971"
```

## Constructor Arguments Explanation

### Oracle Constructor:
- `owner`: Your deployer address (`0x5c3C97Ea087024f91EB11d5659F1B5A3b911E971`)

### TokenManager Constructor:
- `name`: Token name (e.g., "Merlin-97")
- `symbol`: Token symbol (e.g., "MRLN3714")
- `totalSupply`: Total supply in wei (800M tokens = `800000000000000000000000000`)

### Bridge Constructor:
- `tokenManager`: TokenManager contract address
- `transferFee`: Transfer fee in basis points (`100` = 1%)
- `operationFee`: Operation fee in wei (`1000000000000000000` = 1 token)
- `oracle`: Oracle contract address
- `offchainProcessor`: Your deployer address

## Block Explorer Links

### BSC Testnet
- Oracle: https://testnet.bscscan.com/address/0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9
- TokenManager: https://testnet.bscscan.com/address/0xa64D0bCB4b6325C1ed68749727eA544366cca30e
- Bridge: https://testnet.bscscan.com/address/0xf42Bd569fffAE367716412D0C8d3605c204390c2

### Arbitrum Sepolia
- Oracle: https://sepolia.arbiscan.io/address/0xf208A52BaA5a4B61856d854F5b04DBa56Bfb9E92
- TokenManager: https://sepolia.arbiscan.io/address/0xe3BFBF30CEe1E7EA2fFe1bff7d347564cEe0dbEB
- Bridge: https://sepolia.arbiscan.io/address/0x12F457436C1654eF8512F8E948B5a282e6d8f00e

## Troubleshooting

If verification fails:
1. Make sure your API keys are correct in `.env`
2. Wait a few minutes after deployment before verifying
3. Check that constructor arguments match exactly
4. Ensure you're using the correct network flag 