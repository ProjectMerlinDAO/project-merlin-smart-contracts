# Project Merlin Smart Contracts

This repository contains the smart contracts for Project Merlin, a decentralized platform for project funding and community governance.

## Core Components

### TokenManager (MRLN Token)
The central token contract that implements the ERC20 standard with cross-chain bridging capabilities. Key features:
- Minting and burning controlled by Bridge contract
- Initial token distribution handled in constructor
- Integration with Oracle for cross-chain operations
- Built on OpenZeppelin's ERC20 implementation

### TokenLaunchpad
A secure token sale and distribution contract with controlled release mechanics:
- Fixed price token sales in ETH
- Rights-based token distribution
- Percentage-based token releases
- Secure claiming mechanism
- Pausable operations

Key Features:
1. Token Purchase
   - Users buy token rights with ETH
   - Fixed price set at deployment
   - Rights tracked separately from actual tokens
   - No selling or transfer of rights

2. Token Release
   - Owner controls token release schedule
   - Percentage-based releases (1-100%)
   - Release percentage can only increase
   - Multiple partial releases possible

3. Token Claims
   - Users claim tokens based on released percentage
   - Automatic calculation of claimable amounts
   - Multiple claims as release percentage increases
   - Protected against reentrancy

4. Security Features
   - Pausable functionality for emergencies
   - Owner-only critical functions
   - Protected ETH and token withdrawals
   - Safe state transitions
   - Precise calculations with overflow protection

Example Usage:
```solidity
// Deploy with parameters
constructor(
    address tokenContract,  // MRLN token address
    uint256 priceInWei,    // e.g., 1 ether for 1:1 ratio
    uint256 totalForSale   // Total tokens available
)

// User interactions
function buyTokens() external payable
function claimTokens() external
function getClaimableTokens(address) external view returns (uint256)

// Owner controls
function releaseTokens(uint256 percentage) external onlyOwner
function pause() external onlyOwner
function unpause() external onlyOwner
```

### Bridge Contract
Manages cross-chain token transfers with the following features:
- Percentage-based transfer fees
- Flat operation fees
- Pausable operations
- Oracle-controlled fee management
- Offchain processor for cross-chain communication

### Oracle Contract
Controls bridge operations and fee management:
- Updates transfer and operation fees
- Pauses/unpauses bridge operations
- Manages offchain processor address
- Withdraws accumulated fees

### DAO Ecosystem
A comprehensive DAO system for project governance:

#### ProjectDAO
- Manages project submissions and funding
- Implements multi-round voting system
- Handles voter reassignment
- Integrates with CommunityNFT for governance

#### CommunityNFT
- ERC721 token for DAO participation
- Implements voting cycle locking
- Requires MRLN tokens for minting
- Controls voting power in the DAO

#### Voting System
- ProposalList: Manages individual voter project lists
- FinalistVoting: Handles final round voting
- VotingRoundManagement: Coordinates voting rounds
- ProjectManagement: Tracks project status and funding

## Security Considerations

### TokenManager
1. Access Control
   - Only Bridge can mint/burn tokens
   - Owner controls initial distribution
   - Oracle ownership crucial for bridge security

2. Token Economics
   - Fixed total supply
   - Bridge allocation checked against total supply
   - No direct minting after initialization

### TokenLaunchpad
1. Token Sale Security
   - Fixed price prevents manipulation
   - Rights-based distribution for controlled release
   - No direct token transfers during sale
   - Protected against flash loan attacks

2. Release Management
   - Only owner can release tokens
   - One-way percentage increases
   - State updates before transfers
   - Protected claim calculations

3. Operational Safety
   - Pausable for emergencies
   - Reentrancy protection on all state-changing functions
   - Protected ETH withdrawals
   - Safe token withdrawal mechanism
   - Precise calculations with overflow checks

### Bridge
1. Fee Management
   - Maximum fee caps
   - Oracle-controlled fee updates
   - Separate transfer and operation fees

2. Operational Security
   - Pausable operations
   - Protected fee withdrawal
   - Validated token transfers

### Oracle
1. Access Control
   - Owner-only fee management
   - Protected bridge control
   - Secure offchain processor updates

### DAO System
1. Voting Security
   - Time-locked voting windows
   - Protected vote submission
   - Secure voter reassignment

2. Project Management
   - Protected funding operations
   - Validated contribution limits
   - Secure project registration

## Deployment Process

1. Deploy TokenManager with parameters:
   - Token name and symbol
   - Total supply
   - Bridge allocation
   - Initial fee settings

2. Oracle and Bridge are automatically deployed by TokenManager:
   - Oracle deployed first
   - Bridge deployed with Oracle as owner
   - Initial token distribution performed

3. Deploy TokenLaunchpad:
   - Deploy with MRLN token address
   - Set fixed token price in Wei
   - Set total tokens for sale
   - Transfer sale tokens to contract
   - Verify token balance

4. Deploy DAO components:
   - Deploy CommunityNFT
   - Deploy ProjectDAO with NFT address
   - Initialize voting system contracts

## Development Setup

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy contracts
npx hardhat run scripts/deploy.ts --network <network>
```

## Testing

The test suite covers:
- Token functionality
- Bridge operations
- Oracle controls
- DAO voting mechanics
- Project management
- Security scenarios

Run specific test suites:
```bash
npx hardhat test test/TokenManager.test.ts
npx hardhat test test/Bridge.test.ts
npx hardhat test test/Oracle.test.ts
```

## Audit Preparation

Key areas for audit focus:
1. Token minting/burning mechanics
2. Bridge security and fee handling
3. Oracle access controls
4. DAO voting integrity
5. Cross-contract interactions
6. Reentrancy protections
7. Gas optimization

## License

GPL-3.0
