// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title ILotteryPresale
 * @dev Interface for the LotteryPresale contract with draw-based token distribution
 */
interface ILotteryPresale {
    // Enums
    enum PresaleType { REGULAR, LOTTERY }
    enum PresaleStatus { ACTIVE, ENDED, WINNERS_SELECTED, COMPLETED }
    
    // Events
    event PresaleCreated(
        address indexed token, 
        address indexed paymentToken, 
        uint256 tokenPrice, 
        uint256 maxBuyLimit,
        PresaleType presaleType,
        uint256 duration,
        uint256 endTime
    );
    event TokensPurchased(address indexed buyer, uint256 usdcAmount, uint256 tokenAmount);
    event LotteryParticipant(address indexed participant, uint256 usdcAmount);
    event WinnersSelected(address[] winners, uint256 totalWinners, uint256 timestamp);
    event TokensDistributed(address indexed winner, uint256 tokenAmount);
    event UnlockPercentageSet(uint256 newPercentage, uint256 timestamp);
    event TokensClaimed(address indexed user, uint256 amount);
    event PresaleStatusChanged(PresaleStatus status);
    event TokenPriceUpdated(uint256 newPrice);
    event MaxBuyLimitUpdated(uint256 newLimit);
    event EmergencyWithdraw(address indexed admin, uint256 amount);
    event AllTokensUnlocked(uint256 timestamp);
    event RefundIssued(address indexed participant, uint256 amount);
    
    // Structs
    struct Purchase {
        uint256 totalTokensBought;    // Total tokens purchased/won
        uint256 totalClaimedTokens;   // Total tokens already claimed
        uint256 usdcSpent;           // Total USDC spent
        bool isWinner;               // For lottery: whether user won
        bool hasRefund;              // For lottery: whether user can get refund
    }
    
    struct LotteryParticipation {
        uint256 usdcContributed;     // USDC contributed to lottery
        bool isSelected;             // Whether selected as winner
        bool hasClaimedRefund;       // Whether refund has been claimed
    }
    
    struct PresaleInfo {
        address token;               // Token being sold
        address paymentToken;        // Payment token (USDC)
        uint256 tokenPrice;          // Price per token in USDC
        uint256 maxBuyLimit;         // Maximum tokens/USDC a user can contribute
        uint256 currentUnlockPercentage; // Current unlock percentage (0-10000)
        PresaleType presaleType;     // REGULAR or LOTTERY
        PresaleStatus status;        // Current status
        uint256 duration;            // Duration in seconds
        uint256 startTime;           // Start timestamp
        uint256 endTime;             // End timestamp
        uint256 totalTokensSold;     // Total tokens sold/distributed
        uint256 totalUsdcRaised;     // Total USDC raised
        uint256 totalParticipants;   // Total participants
        uint256 selectedWinners;     // Number of selected winners (lottery only)
    }
    
    struct UserTokenStatus {
        uint256 totalTokensBought;   // Total tokens user purchased/won
        uint256 totalUnlockedTokens; // Total tokens currently unlocked
        uint256 totalClaimedTokens;  // Total tokens user has claimed
        uint256 totalLockedTokens;   // Total tokens still locked
        uint256 claimableTokens;     // Tokens available to claim right now
        bool isWinner;               // Whether user is a winner (lottery)
        uint256 refundableAmount;    // USDC refundable amount (lottery losers)
    }
    
    // View functions
    function presaleInfo() external view returns (PresaleInfo memory);
    function getUserPurchase(address user) external view returns (Purchase memory);
    function getLotteryParticipation(address user) external view returns (LotteryParticipation memory);
    function getUserTokenStatus(address user) external view returns (UserTokenStatus memory);
    function getClaimableAmount(address user) external view returns (uint256);
    function getUnlockedAmount(address user) external view returns (uint256);
    function getLockedAmount(address user) external view returns (uint256);
    function getClaimedAmount(address user) external view returns (uint256);
    function getRefundableAmount(address user) external view returns (uint256);
    function getTotalParticipants() external view returns (uint256);
    function getWinners() external view returns (address[] memory);
    function isPresaleActive() external view returns (bool);
    function isPresaleEnded() external view returns (bool);
    function canSelectWinners() external view returns (bool);
    function getRemainingTime() external view returns (uint256);
    
    // User functions
    function buyTokens(uint256 usdcAmount) external;
    function participateInLottery(uint256 usdcAmount) external;
    function claimTokens() external;
    function claimRefund() external;
    
    // Admin functions
    function setTokenPrice(uint256 newPrice) external;
    function setMaxBuyLimit(uint256 newLimit) external;
    function setUnlockPercentage(uint256 percentage) external;
    function unlockAllTokens() external;
    function selectWinners(address[] calldata winners) external;
    function distributeTokensToWinners() external;
    function endPresale() external;
    function withdrawUSDC(uint256 amount) external;
    function emergencyWithdrawTokens(uint256 amount) external;
    function addTokensToPresale(uint256 amount) external;
} 