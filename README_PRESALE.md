# TokenPresale Contract

## Overview

The TokenPresale contract is a comprehensive presale system with time-locked distribution features. It allows users to purchase tokens with USDC while providing admins with granular control over token release schedules.

## Key Features

1. **USDC Payment System**: Users buy tokens using USDC as the payment method
2. **Time-Locked Distribution**: Admin controls unlock percentages for gradual token release
3. **Maximum Buy Limits**: Prevents whale dominance by limiting individual purchases
4. **Secure Architecture**: Built with OpenZeppelin's security standards
5. **Emergency Controls**: Admin can pause/unpause and withdraw funds in emergencies

## Contract Architecture

### Core Components

- **TokenPresale.sol**: Main presale contract
- **ITokenPresale.sol**: Interface defining all functions and events
- **MockERC20.sol**: Testing utility contract

### Dependencies

- OpenZeppelin Contracts (v4.9.6)
- Hardhat Development Environment
- TypeScript Support

## Usage Examples

### 1. Deployment

```typescript
// Deploy the presale contract
const TokenPresale = await ethers.getContractFactory("TokenPresale");
const presale = await TokenPresale.deploy(
  "0x1234...", // Token address
  "0x5678...", // USDC address
  ethers.parseUnits("0.1", 6), // 0.1 USDC per token
  ethers.parseUnits("10000", 18) // 10,000 tokens max per user
);
```

### 2. Admin Setup

```typescript
// Fund the presale with tokens
await token.approve(presale.address, ethers.parseUnits("100000", 18));
await presale.addTokensToPresale(ethers.parseUnits("100000", 18));

// Activate the presale
await presale.setPresaleStatus(true);

// Set initial unlock percentage (e.g., 10%)
await presale.setUnlockPercentage(1000); // 1000 = 10%
```

### 3. User Purchase Flow

```typescript
// User approves USDC spending
await usdc.connect(user).approve(presale.address, ethers.parseUnits("100", 6));

// User buys tokens
await presale.connect(user).buyTokens(ethers.parseUnits("100", 6));

// User claims unlocked tokens
await presale.connect(user).claimTokens();
```

### 4. Admin Token Release Management

```typescript
// Gradually increase unlock percentage
await presale.setUnlockPercentage(2000); // 20%
await presale.setUnlockPercentage(3000); // 30%
await presale.setUnlockPercentage(5000); // 50%
await presale.setUnlockPercentage(10000); // 100% (full unlock)
```

## Contract Functions

### User Functions

- `buyTokens(uint256 usdcAmount)`: Purchase tokens with USDC
- `claimTokens()`: Claim available unlocked tokens
- `getClaimableAmount(address user)`: Check how many tokens can be claimed

### Admin Functions

- `setTokenPrice(uint256 newPrice)`: Update token price
- `setMaxBuyLimit(uint256 newLimit)`: Update maximum buy limit
- `setUnlockPercentage(uint256 percentage)`: Set unlock percentage (0-10000)
- `setPresaleStatus(bool status)`: Activate/deactivate presale
- `withdrawUSDC(uint256 amount)`: Withdraw USDC from contract
- `emergencyWithdrawTokens(uint256 amount)`: Emergency token withdrawal
- `addTokensToPresale(uint256 amount)`: Add more tokens to presale

### View Functions

- `presaleInfo()`: Get complete presale information
- `getUserPurchase(address user)`: Get user's purchase details
- `getTotalPurchasers()`: Get total number of purchasers
- `getContractTokenBalance()`: Get contract's token balance
- `getContractUsdcBalance()`: Get contract's USDC balance

## Events

- `PresaleCreated`: Emitted when presale is deployed
- `TokensPurchased`: Emitted when user buys tokens
- `UnlockPercentageSet`: Emitted when unlock percentage is updated
- `TokensClaimed`: Emitted when user claims tokens
- `PresaleStatusChanged`: Emitted when presale is activated/deactivated

## Security Features

1. **ReentrancyGuard**: Prevents reentrancy attacks
2. **Pausable**: Emergency pause functionality
3. **Ownable**: Access control for admin functions
4. **Safe Math**: Prevents overflow/underflow attacks
5. **Input Validation**: Comprehensive parameter validation

## Example Presale Scenarios

### Scenario 1: Basic Presale

```typescript
// Setup: 1 token = 0.1 USDC, max 10,000 tokens per user
// User buys 100 USDC worth = 1,000 tokens
// Admin unlocks 10% initially = 100 tokens claimable
// Later admin unlocks 50% = 500 tokens total claimable
// Finally admin unlocks 100% = 1,000 tokens total claimable
```

### Scenario 2: Gradual Release

```typescript
// Week 1: Admin sets 10% unlock
// Week 2: Admin sets 20% unlock
// Week 3: Admin sets 30% unlock
// Week 4: Admin sets 50% unlock
// Week 8: Admin sets 100% unlock
```

### Scenario 3: Emergency Situations

```typescript
// Pause presale if needed
await presale.pause();

// Emergency withdraw tokens
await presale.emergencyWithdrawTokens(ethers.parseUnits("1000", 18));

// Withdraw raised USDC
await presale.withdrawUSDC(ethers.parseUnits("500", 6));
```

## Testing

The contract includes comprehensive tests covering:

- Deployment and initialization
- Admin function access control
- Token purchase mechanics
- Unlock percentage functionality
- Emergency withdrawal features
- Edge cases and error conditions

## Deployment Checklist

1. ✅ Deploy token contract
2. ✅ Deploy USDC contract (or use existing)
3. ✅ Deploy TokenPresale contract
4. ✅ Fund presale with tokens
5. ✅ Set appropriate token price
6. ✅ Set maximum buy limits
7. ✅ Activate presale
8. ✅ Set initial unlock percentage
9. ✅ Monitor and manage unlock schedule
10. ✅ Handle emergency situations if needed

## Gas Optimization

The contract is optimized for gas efficiency:

- Minimal storage operations
- Efficient mathematical operations
- Optimized event emission
- Smart contract size optimization

## Best Practices

1. **Test thoroughly** before mainnet deployment
2. **Set reasonable unlock schedules** to maintain user trust
3. **Monitor contract balance** to ensure sufficient tokens
4. **Use multisig wallets** for admin operations
5. **Implement gradual unlock** rather than immediate full unlock
6. **Communicate unlock schedule** to users clearly
7. **Keep emergency withdrawal** capabilities for security

## Support and Maintenance

- Regular monitoring of contract state
- Timely unlock percentage updates
- Emergency response procedures
- User support for claiming issues
- Documentation updates as needed 