// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title ITokenPresale
 * @dev Interface for the TokenPresale contract
 */
interface ITokenPresale {
    // Events
    event PresaleCreated(address indexed token, address indexed paymentToken, uint256 tokenPrice, uint256 maxBuyLimit);
    event TokensPurchased(address indexed buyer, uint256 usdcAmount, uint256 tokenAmount);
    event UnlockPercentageSet(uint256 newPercentage, uint256 timestamp);
    event TokensClaimed(address indexed user, uint256 amount);
    event PresaleStatusChanged(bool isActive);
    event TokenPriceUpdated(uint256 newPrice);
    event MaxBuyLimitUpdated(uint256 newLimit);
    event EmergencyWithdraw(address indexed admin, uint256 amount);
    event AllTokensUnlocked(uint256 timestamp);
    
    // Structs
    struct Purchase {
        uint256 totalTokensBought;    // Total tokens purchased
        uint256 totalClaimedTokens;   // Total tokens already claimed
        uint256 usdcSpent;           // Total USDC spent
    }
    
    struct PresaleInfo {
        address token;               // Token being sold
        address paymentToken;        // Payment token (USDC)
        uint256 tokenPrice;          // Price per token in USDC (with decimals)
        uint256 maxBuyLimit;         // Maximum tokens a user can buy
        uint256 currentUnlockPercentage; // Current unlock percentage (0-10000, where 10000 = 100%)
        bool isActive;               // Whether presale is active
        uint256 totalTokensSold;     // Total tokens sold
        uint256 totalUsdcRaised;     // Total USDC raised
    }
    
    struct UserTokenStatus {
        uint256 totalTokensBought;   // Total tokens user purchased
        uint256 totalUnlockedTokens; // Total tokens currently unlocked for user
        uint256 totalClaimedTokens;  // Total tokens user has claimed
        uint256 totalLockedTokens;   // Total tokens still locked for user
        uint256 claimableTokens;     // Tokens available to claim right now
    }
    
    // View functions
    function presaleInfo() external view returns (PresaleInfo memory);
    function getUserPurchase(address user) external view returns (Purchase memory);
    function getUserTokenStatus(address user) external view returns (UserTokenStatus memory);
    function getClaimableAmount(address user) external view returns (uint256);
    function getUnlockedAmount(address user) external view returns (uint256);
    function getLockedAmount(address user) external view returns (uint256);
    function getClaimedAmount(address user) external view returns (uint256);
    function getTotalPurchasers() external view returns (uint256);
    function isPresaleActive() external view returns (bool);
    
    // User functions
    function buyTokens(uint256 usdcAmount) external;
    function claimTokens() external;
    
    // Admin functions
    function setTokenPrice(uint256 newPrice) external;
    function setMaxBuyLimit(uint256 newLimit) external;
    function setUnlockPercentage(uint256 percentage) external;
    function unlockAllTokens() external;
    function setPresaleStatus(bool status) external;
    function stopPresale() external;
    function withdrawUSDC(uint256 amount) external;
    function emergencyWithdrawTokens(uint256 amount) external;
    function addTokensToPresale(uint256 amount) external;
} 