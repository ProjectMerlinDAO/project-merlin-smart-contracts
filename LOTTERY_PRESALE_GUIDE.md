# Lottery Presale System - Complete Guide

## Overview

The **LotteryPresale** contract supports two presale modes:
1. **Regular Presale**: Users buy tokens directly with USDC (like the original TokenPresale)
2. **Lottery Presale**: Users participate in a draw, only winners get tokens, losers get refunds

Both modes include:
- ⏰ **Time-based duration** set by admin
- 🔒 **Progressive token unlocking** controlled by admin
- 💰 **USDC payment system**
- 🛡️ **Anti-double-claim protection**

## Your Example Scenario

**Setup**: 3 users (A, B, C) participate in lottery presale
- Each contributes USDC to the lottery pool
- Admin selects winners after the draw period ends
- Winners get tokens, losers get refunds

### Example Flow:

```solidity
// 1. Deploy lottery presale (3 days duration)
LotteryPresale lotteryPresale = new LotteryPresale(
    tokenAddress,
    usdcAddress, 
    0.1 * 10^6,  // 0.1 USDC per token
    200 * 10^6,  // 200 USDC max contribution per user
    PresaleType.LOTTERY,
    3 * 24 * 60 * 60  // 3 days
);

// 2. Users participate in lottery
// User A contributes 100 USDC
await usdc.connect(userA).approve(lotteryPresale.address, 100 * 10^6);
await lotteryPresale.connect(userA).participateInLottery(100 * 10^6);

// User B contributes 50 USDC  
await usdc.connect(userB).approve(lotteryPresale.address, 50 * 10^6);
await lotteryPresale.connect(userB).participateInLottery(50 * 10^6);

// User C contributes 50 USDC
await usdc.connect(userC).approve(lotteryPresale.address, 50 * 10^6);
await lotteryPresale.connect(userC).participateInLottery(50 * 10^6);

// Total pool: 200 USDC = 2000 tokens (at 0.1 USDC/token)

// 3. After 3 days, admin selects winners
await lotteryPresale.selectWinners([userA.address, userB.address]);

// 4. Admin distributes tokens to winners
await lotteryPresale.distributeTokensToWinners();
// User A gets: 1000 tokens (2000 ÷ 2 winners)
// User B gets: 1000 tokens (2000 ÷ 2 winners)
// User C gets: nothing (but can claim 50 USDC refund)

// 5. Winners can claim tokens (with unlock progression)
await lotteryPresale.setUnlockPercentage(2500); // 25%
await lotteryPresale.connect(userA).claimTokens(); // Claims 250 tokens
await lotteryPresale.connect(userB).claimTokens(); // Claims 250 tokens

// 6. Loser can claim refund
await lotteryPresale.connect(userC).claimRefund(); // Gets 50 USDC back
```

## Contract Features

### 1. Dual Mode Support

#### Regular Presale
```solidity
// Deploy regular presale (7 days)
LotteryPresale regularPresale = new LotteryPresale(
    token, usdc, price, maxLimit, 
    PresaleType.REGULAR, 
    7 days
);

// Users buy tokens directly
await regularPresale.buyTokens(usdcAmount);
```

#### Lottery Presale  
```solidity
// Deploy lottery presale (3 days)
LotteryPresale lotteryPresale = new LotteryPresale(
    token, usdc, price, maxLimit, 
    PresaleType.LOTTERY, 
    3 days
);

// Users participate in lottery
await lotteryPresale.participateInLottery(usdcAmount);
```

### 2. Time-Based Duration

```solidity
// Check remaining time
uint256 timeLeft = await presale.getRemainingTime();
console.log("Time remaining:", timeLeft, "seconds");

// Check if presale ended
bool ended = await presale.isPresaleEnded();

// Admin can end early
await presale.endPresale();
```

### 3. Lottery Winner Selection

```solidity
// After presale ends, admin selects winners
address[] winners = [userA, userB, userD]; // Can select any number
await lotteryPresale.selectWinners(winners);

// Distribute tokens equally among winners
await lotteryPresale.distributeTokensToWinners();

// Get list of winners
address[] winnersList = await lotteryPresale.getWinners();
```

### 4. Refund System

```solidity
// Check refund amount for lottery losers
uint256 refundable = await lotteryPresale.getRefundableAmount(userC);

// Claim refund (only for lottery losers)
await lotteryPresale.connect(userC).claimRefund();
```

### 5. Comprehensive Status Tracking

```solidity
// Get complete user status
const status = await lotteryPresale.getUserTokenStatus(userAddress);
console.log("Tokens bought:", status.totalTokensBought);
console.log("Tokens unlocked:", status.totalUnlockedTokens);
console.log("Tokens claimed:", status.totalClaimedTokens);
console.log("Tokens locked:", status.totalLockedTokens);
console.log("Claimable now:", status.claimableTokens);
console.log("Is winner:", status.isWinner);
console.log("Refundable USDC:", status.refundableAmount);

// Get lottery participation details
const participation = await lotteryPresale.getLotteryParticipation(userAddress);
console.log("USDC contributed:", participation.usdcContributed);
console.log("Is selected:", participation.isSelected);
console.log("Refund claimed:", participation.hasClaimedRefund);
```

## State Machine

### Regular Presale States
```
ACTIVE → ENDED → (tokens unlocked progressively)
```

### Lottery Presale States
```
ACTIVE → ENDED → WINNERS_SELECTED → COMPLETED
                     ↓
              (tokens distributed to winners)
                     ↓
              (refunds available for losers)
```

## Events

### Lottery-Specific Events
```solidity
event LotteryParticipant(address indexed participant, uint256 usdcAmount);
event WinnersSelected(address[] winners, uint256 totalWinners, uint256 timestamp);
event TokensDistributed(address indexed winner, uint256 tokenAmount);
event RefundIssued(address indexed participant, uint256 amount);
```

### Common Events
```solidity
event PresaleCreated(address token, address paymentToken, uint256 price, uint256 maxLimit, PresaleType type, uint256 duration, uint256 endTime);
event TokensPurchased(address indexed buyer, uint256 usdcAmount, uint256 tokenAmount);
event TokensClaimed(address indexed user, uint256 amount);
event UnlockPercentageSet(uint256 newPercentage, uint256 timestamp);
```

## Frontend Integration Examples

### React Component Example
```javascript
import { ethers } from 'ethers';

function LotteryPresaleComponent() {
  const [userStatus, setUserStatus] = useState(null);
  const [presaleInfo, setPresaleInfo] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Get presale information
  useEffect(() => {
    async function fetchPresaleInfo() {
      const info = await lotteryPresale.presaleInfo();
      setPresaleInfo(info);
      
      const remaining = await lotteryPresale.getRemainingTime();
      setTimeRemaining(Number(remaining));
    }
    fetchPresaleInfo();
  }, []);

  // Get user status
  useEffect(() => {
    async function fetchUserStatus() {
      if (userAddress) {
        const status = await lotteryPresale.getUserTokenStatus(userAddress);
        setUserStatus(status);
      }
    }
    fetchUserStatus();
  }, [userAddress]);

  // Participate in lottery
  async function participateInLottery(usdcAmount) {
    try {
      // Approve USDC
      await usdc.approve(lotteryPresale.address, usdcAmount);
      
      // Participate
      const tx = await lotteryPresale.participateInLottery(usdcAmount);
      await tx.wait();
      
      alert('Successfully participated in lottery!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  // Claim tokens or refund
  async function claimTokensOrRefund() {
    try {
      if (userStatus.claimableTokens > 0) {
        const tx = await lotteryPresale.claimTokens();
        await tx.wait();
        alert('Tokens claimed successfully!');
      } else if (userStatus.refundableAmount > 0) {
        const tx = await lotteryPresale.claimRefund();
        await tx.wait();
        alert('Refund claimed successfully!');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  return (
    <div>
      <h2>Lottery Presale</h2>
      
      {/* Presale Info */}
      <div>
        <p>Type: {presaleInfo?.presaleType === 0 ? 'Regular' : 'Lottery'}</p>
        <p>Status: {presaleInfo?.status}</p>
        <p>Time Remaining: {Math.floor(timeRemaining / 3600)} hours</p>
        <p>Total Participants: {presaleInfo?.totalParticipants}</p>
        <p>Total USDC Raised: {ethers.formatUnits(presaleInfo?.totalUsdcRaised, 6)}</p>
      </div>

      {/* User Status */}
      {userStatus && (
        <div>
          <h3>Your Status</h3>
          <p>Tokens Bought: {ethers.formatUnits(userStatus.totalTokensBought, 18)}</p>
          <p>Tokens Unlocked: {ethers.formatUnits(userStatus.totalUnlockedTokens, 18)}</p>
          <p>Tokens Claimed: {ethers.formatUnits(userStatus.totalClaimedTokens, 18)}</p>
          <p>Claimable Now: {ethers.formatUnits(userStatus.claimableTokens, 18)}</p>
          <p>Is Winner: {userStatus.isWinner ? 'Yes' : 'No'}</p>
          <p>Refundable: {ethers.formatUnits(userStatus.refundableAmount, 6)} USDC</p>
        </div>
      )}

      {/* Actions */}
      <div>
        {presaleInfo?.status === 0 && ( // ACTIVE
          <button onClick={() => participateInLottery(ethers.parseUnits("100", 6))}>
            Participate with 100 USDC
          </button>
        )}
        
        {(userStatus?.claimableTokens > 0 || userStatus?.refundableAmount > 0) && (
          <button onClick={claimTokensOrRefund}>
            {userStatus.claimableTokens > 0 ? 'Claim Tokens' : 'Claim Refund'}
          </button>
        )}
      </div>
    </div>
  );
}
```

## Admin Functions

### Lottery Management
```solidity
// Select winners after presale ends
await lotteryPresale.selectWinners([winner1, winner2, winner3]);

// Distribute tokens to winners
await lotteryPresale.distributeTokensToWinners();

// Check if winners can be selected
bool canSelect = await lotteryPresale.canSelectWinners();
```

### Token Unlocking (Same as Original)
```solidity
// Set unlock percentage
await presale.setUnlockPercentage(2500); // 25%

// Unlock all tokens
await presale.unlockAllTokens(); // 100%
```

### Emergency Functions
```solidity
// End presale early
await presale.endPresale();

// Withdraw USDC
await presale.withdrawUSDC(amount);

// Emergency withdraw tokens
await presale.emergencyWithdrawTokens(amount);
```

## Security Features

✅ **Time-based Controls**: Presales automatically end after duration
✅ **Winner Validation**: Only participants can be selected as winners  
✅ **Refund Protection**: Losers can only claim refunds after winners are selected
✅ **Anti-Double-Claim**: Same protection as original TokenPresale
✅ **Access Controls**: Only admin can select winners and manage presale
✅ **Reentrancy Protection**: All state-changing functions protected

## Deployment Examples

### Regular Presale (7 days)
```solidity
LotteryPresale regularPresale = new LotteryPresale(
    tokenAddress,
    usdcAddress,
    ethers.parseUnits("0.1", 6),    // 0.1 USDC per token
    ethers.parseUnits("10000", 18), // 10,000 tokens max per user
    PresaleType.REGULAR,            // Regular mode
    7 * 24 * 60 * 60               // 7 days
);
```

### Lottery Presale (3 days)
```solidity
LotteryPresale lotteryPresale = new LotteryPresale(
    tokenAddress,
    usdcAddress,
    ethers.parseUnits("0.05", 6),   // 0.05 USDC per token (cheaper)
    ethers.parseUnits("200", 6),    // 200 USDC max contribution
    PresaleType.LOTTERY,            // Lottery mode
    3 * 24 * 60 * 60               // 3 days
);
```

This system gives you complete flexibility to run both traditional presales and exciting lottery-based presales with time limits and fair winner selection! 🎯 