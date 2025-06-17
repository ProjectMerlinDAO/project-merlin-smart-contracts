# TokenPresale - Token Status & Anti-Double-Claim Protection

## Overview

The TokenPresale contract now includes comprehensive token status tracking and bulletproof anti-double-claim protection to ensure users can clearly see their token distribution and cannot claim the same tokens multiple times.

## New View Functions

### Individual Token Status Functions

1. **`getUnlockedAmount(address user)`** - Returns total unlocked tokens for a user (regardless of claimed status)
2. **`getLockedAmount(address user)`** - Returns amount of tokens still locked for a user
3. **`getClaimedAmount(address user)`** - Returns amount of tokens user has already claimed
4. **`getClaimableAmount(address user)`** - Returns tokens available to claim right now

### Comprehensive Status Function

**`getUserTokenStatus(address user)`** - Returns a complete `UserTokenStatus` struct with:
- `totalTokensBought` - Total tokens user purchased
- `totalUnlockedTokens` - Total tokens currently unlocked for user
- `totalClaimedTokens` - Total tokens user has claimed
- `totalLockedTokens` - Total tokens still locked for user
- `claimableTokens` - Tokens available to claim right now

## Anti-Double-Claim Protection

### How It Works

The claiming mechanism prevents users from claiming the same tokens multiple times through:

1. **Tracking System**: Each user's `Purchase` struct tracks:
   - `totalTokensBought` - Never changes after purchase
   - `totalClaimedTokens` - Increases with each claim

2. **Calculation Logic**: 
   ```solidity
   totalUnlockedTokens = (totalTokensBought * currentUnlockPercentage) / 10000
   claimableAmount = totalUnlockedTokens - totalClaimedTokens
   ```

3. **State Updates**: When claiming, `totalClaimedTokens` is updated BEFORE the token transfer (reentrancy protection)

### Example Scenarios

#### Scenario 1: Initial State
- User buys 1000 tokens
- Unlock percentage: 0%
- Status: `unlocked=0, locked=1000, claimed=0, claimable=0`

#### Scenario 2: First Unlock (25%)
- Admin sets unlock to 25%
- Status: `unlocked=250, locked=750, claimed=0, claimable=250`
- User can claim 250 tokens

#### Scenario 3: After First Claim
- User claims 250 tokens
- Status: `unlocked=250, locked=750, claimed=250, claimable=0`
- **Attempting to claim again fails**: "No tokens available to claim"

#### Scenario 4: Second Unlock (50% total)
- Admin increases unlock to 50%
- Status: `unlocked=500, locked=500, claimed=250, claimable=250`
- User can claim additional 250 tokens (not the same tokens as before)

#### Scenario 5: After Second Claim
- User claims another 250 tokens
- Status: `unlocked=500, locked=500, claimed=500, claimable=0`
- Total claimed: 500 tokens (250 + 250)

## Usage Examples

### Frontend Integration

```javascript
// Get comprehensive token status
const tokenStatus = await tokenPresale.getUserTokenStatus(userAddress);
console.log("Tokens bought:", ethers.formatUnits(tokenStatus.totalTokensBought, 18));
console.log("Tokens unlocked:", ethers.formatUnits(tokenStatus.totalUnlockedTokens, 18));
console.log("Tokens claimed:", ethers.formatUnits(tokenStatus.totalClaimedTokens, 18));
console.log("Tokens locked:", ethers.formatUnits(tokenStatus.totalLockedTokens, 18));
console.log("Tokens claimable now:", ethers.formatUnits(tokenStatus.claimableTokens, 18));

// Check if user can claim
const claimable = await tokenPresale.getClaimableAmount(userAddress);
if (claimable > 0) {
    console.log("Can claim:", ethers.formatUnits(claimable, 18), "tokens");
    // Enable claim button
} else {
    console.log("No tokens available to claim");
    // Disable claim button
}
```

### Individual Status Checks

```javascript
// Get individual amounts
const unlocked = await tokenPresale.getUnlockedAmount(userAddress);
const locked = await tokenPresale.getLockedAmount(userAddress);
const claimed = await tokenPresale.getClaimedAmount(userAddress);
const claimable = await tokenPresale.getClaimableAmount(userAddress);

// Display in UI
displayTokenDistribution({
    unlocked: ethers.formatUnits(unlocked, 18),
    locked: ethers.formatUnits(locked, 18),
    claimed: ethers.formatUnits(claimed, 18),
    claimable: ethers.formatUnits(claimable, 18)
});
```

## Security Features

### 1. Reentrancy Protection
- Uses `nonReentrant` modifier on `claimTokens()`
- Updates state before external calls
- Prevents reentrancy attacks

### 2. State Consistency
- `totalClaimedTokens` can only increase
- `currentUnlockPercentage` can only increase
- Mathematical guarantees prevent over-claiming

### 3. Input Validation
- All unlock percentages must be ≤ 100% (10000 basis points)
- Claimable amount calculation handles edge cases
- Zero token purchases return zero for all status functions

## Test Coverage

The contract includes comprehensive tests covering:

- **Basic claiming flow**: Users can claim unlocked tokens
- **Double-claim prevention**: Users cannot claim the same tokens twice
- **Progressive unlocking**: Users can claim additional tokens after new unlocks
- **Independent tracking**: Multiple users' claims don't interfere with each other
- **Edge cases**: Zero purchases, full unlocks, small amounts
- **View functions**: All status functions return correct values

## Events

The contract emits detailed events for transparency:

- `TokensClaimed(address indexed user, uint256 amount)` - When tokens are claimed
- `UnlockPercentageSet(uint256 newPercentage, uint256 timestamp)` - When unlock % changes
- `AllTokensUnlocked(uint256 timestamp)` - When 100% is unlocked

## Admin Controls

Admins can:
- Set unlock percentages (only increase, never decrease)
- Unlock all tokens instantly with `unlockAllTokens()`
- View total statistics and individual user statuses
- Emergency withdraw functions remain available

This implementation ensures complete transparency for users while providing bulletproof protection against double-claiming and other potential exploits. 