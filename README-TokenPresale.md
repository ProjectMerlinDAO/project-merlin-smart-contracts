# Enhanced TokenPresale Contract 🚀

An advanced token presale contract with dual payment token support (USDC & USDT), min/max buy limits, and comprehensive token distribution management.

## ✨ Features

### Core Features
- **Dual Payment Token Support**: Accept both USDC and USDT
- **Min/Max Buy Limits**: Configurable minimum and maximum purchase amounts per user
- **Time-locked Distribution**: Admin-controlled unlock percentages for gradual token release
- **Sold Percentage Tracking**: Real-time tracking of tokens sold percentage
- **Fee-on-Transfer Protection**: Handles tokens with transfer fees correctly
- **Emergency Controls**: Pause functionality and emergency withdrawals

### Security Features
- **Reentrancy Protection**: Uses OpenZeppelin's ReentrancyGuard
- **Balance Validation**: Checks balances before and after transfers
- **Access Control**: Owner-only admin functions
- **Safe Math**: Overflow/underflow protection

## 📋 Contract Configuration

### Deployment Parameters
- **MRL Token Price**: 1 MRL = 0.04 USDC/USDT
- **Minimum Purchase**: 100 USDC/USDT
- **Maximum Purchase**: 500 USDC/USDT per user
- **Supported Payment Tokens**: USDC, USDT (extensible)

## 🚀 Deployment

### Prerequisites
```bash
npm install
```

### Environment Setup
Create a `.env` file:
```env
PRIVATE_KEY=your_private_key_here
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBISCAN_API_KEY=your_arbiscan_api_key
MRL_TOKEN_ADDRESS=your_mrl_token_address
```

### Deploy to Arbitrum
```bash
# Deploy to Arbitrum mainnet
npm run deploy-arbitrum

# Deploy to Arbitrum testnet
npm run deploy-arbitrum-testnet

# Test locally
npm run node
npm run test-presale
```

## 📖 Usage Guide

### For Users

#### 1. Buy Tokens with USDC
```javascript
// Approve USDC
await usdc.approve(presaleAddress, usdcAmount);

// Buy tokens
await tokenPresale.buyTokens(usdcAddress, usdcAmount);
```

#### 2. Buy Tokens with USDT
```javascript
// Approve USDT
await usdt.approve(presaleAddress, usdtAmount);

// Buy tokens
await tokenPresale.buyTokens(usdtAddress, usdtAmount);
```

#### 3. Claim Unlocked Tokens
```javascript
// Check claimable amount
const claimable = await tokenPresale.getClaimableAmount(userAddress);

// Claim tokens
await tokenPresale.claimTokens();
```

#### 4. Check Token Status
```javascript
const status = await tokenPresale.getUserTokenStatus(userAddress);
console.log({
    totalBought: status.totalTokensBought,
    totalUnlocked: status.totalUnlockedTokens,
    totalClaimed: status.totalClaimedTokens,
    claimableNow: status.claimableTokens
});
```

### For Admins

#### 1. Activate Presale
```javascript
await tokenPresale.setPresaleStatus(true);
```

#### 2. Set Unlock Percentage
```javascript
// Unlock 25% of tokens
await tokenPresale.setUnlockPercentage(2500);

// Unlock all tokens
await tokenPresale.unlockAllTokens();
```

#### 3. Add More Tokens
```javascript
// Approve MRL tokens first
await mrlToken.approve(presaleAddress, amount);

// Add to presale
await tokenPresale.addTokensToPresale(amount);
```

#### 4. Withdraw Payments
```javascript
// Withdraw USDC
await tokenPresale.withdrawPaymentToken(usdcAddress, amount);

// Withdraw USDT
await tokenPresale.withdrawPaymentToken(usdtAddress, amount);
```

#### 5. Update Limits
```javascript
// Update price
await tokenPresale.setTokenPrice(newPrice);

// Update limits
await tokenPresale.setMinBuyLimit(newMinLimit);
await tokenPresale.setMaxBuyLimit(newMaxLimit);
```

## 📊 Monitoring & Analytics

### Check Presale Status
```javascript
const info = await tokenPresale.getExtendedPresaleInfo();
console.log({
    soldPercentage: info.soldPercentage / 100, // Convert to percentage
    totalSold: info.totalTokensSold,
    totalRaised: info.totalPaymentRaised,
    isActive: info.isActive
});
```

### Get Sold Percentage
```javascript
const soldPercentage = await tokenPresale.getSoldPercentage();
console.log(`${soldPercentage / 100}% sold`);
```

## 🔧 Contract Interface

### Key Functions

#### User Functions
- `buyTokens(address paymentToken, uint256 amount)`: Purchase tokens
- `claimTokens()`: Claim unlocked tokens
- `getUserTokenStatus(address user)`: Get comprehensive user status
- `getClaimableAmount(address user)`: Get claimable token amount

#### Admin Functions
- `setPresaleStatus(bool status)`: Activate/deactivate presale
- `setUnlockPercentage(uint256 percentage)`: Set unlock percentage (0-10000)
- `addTokensToPresale(uint256 amount)`: Add more MRL tokens
- `withdrawPaymentToken(address token, uint256 amount)`: Withdraw payments
- `setTokenPrice(uint256 price)`: Update token price
- `setMinBuyLimit(uint256 limit)`: Update minimum buy limit
- `setMaxBuyLimit(uint256 limit)`: Update maximum buy limit

#### View Functions
- `getSoldPercentage()`: Get percentage of tokens sold
- `getExtendedPresaleInfo()`: Get comprehensive presale information
- `isPaymentTokenAccepted(address token)`: Check if payment token is accepted

## 🎯 Key Improvements Over Original

1. **Dual Payment Support**: Added USDT alongside USDC
2. **Min/Max Limits**: Better control over purchase amounts
3. **Sold Percentage**: Real-time tracking of sale progress
4. **Fee Protection**: Handles fee-on-transfer tokens correctly
5. **Enhanced Events**: More detailed event logging
6. **Extensible Payments**: Can add more payment tokens
7. **Better Admin Controls**: More granular admin functions

## 🔒 Security Considerations

1. **Always verify contract addresses** before interacting
2. **Check allowances** before making purchases
3. **Monitor unlock schedules** for token claiming
4. **Verify transaction details** before confirming
5. **Use official frontend interfaces** only

## 📞 Support

For technical support or questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: [Full docs](https://docs.your-project.com)
- Community: [Discord/Telegram](https://discord.gg/your-invite)

## 📄 License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ by the Merlin Team* 