// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title ITokenPresale
 * @dev Interface for the TokenPresale contract
 */
interface ITokenPresale {
    // Events
    event PresaleCreated(address indexed token, address indexed paymentToken, uint256 tokenPrice, uint256 minBuyLimit, uint256 maxBuyLimit, uint256 totalTokensForSale);
    event TokensPurchased(address indexed buyer, address indexed paymentToken, uint256 paymentAmount, uint256 tokenAmount);
    event UnlockPercentageSet(uint256 newPercentage, uint256 timestamp);
    event TokensClaimed(address indexed user, uint256 amount);
    event PresaleStatusChanged(bool isActive);
    event TokenPriceUpdated(uint256 newPrice);
    event MinBuyLimitUpdated(uint256 newLimit);
    event MaxBuyLimitUpdated(uint256 newLimit);
    event TotalTokensForSaleUpdated(uint256 newTotal);
    event PaymentWithdrawn(address indexed paymentToken, address indexed admin, uint256 amount);
    event EmergencyWithdraw(address indexed admin, uint256 amount);
    event AllTokensUnlocked(uint256 timestamp);
    event TokensAddedToPresale(uint256 amount);
    event PaymentTokenAdded(address indexed paymentToken);
    event PaymentTokenRemoved(address indexed paymentToken);
    
    // Structs
    struct Purchase {
        uint256 totalTokensBought;    // Total tokens purchased
        uint256 totalClaimedTokens;   // Total tokens already claimed
        uint256 paymentSpent;         // Total payment tokens spent
    }
    
    struct PresaleInfo {
        address token;               // Token being sold
        address paymentToken;        // Payment token (for backward compatibility)
        uint256 tokenPrice;          // Price per token in payment token (with decimals)
        uint256 minBuyLimit;         // Minimum payment amount per purchase
        uint256 maxBuyLimit;         // Maximum payment amount per user total
        uint256 totalTokensForSale;  // Total tokens available for sale
        uint256 currentUnlockPercentage; // Current unlock percentage (0-10000, where 10000 = 100%)
        bool isActive;               // Whether presale is active
        uint256 totalTokensSold;     // Total tokens sold
        uint256 totalPaymentRaised;  // Total payment tokens raised
    }
    
    struct ExtendedPresaleInfo {
        address token;               // Token being sold
        address usdc;                // USDC payment token
        address usdt;                // USDT payment token
        uint256 tokenPrice;          // Price per token in payment token (with decimals)
        uint256 minBuyLimit;         // Minimum payment amount per purchase
        uint256 maxBuyLimit;         // Maximum payment amount per user total
        uint256 totalTokensForSale;  // Total tokens available for sale
        uint256 currentUnlockPercentage; // Current unlock percentage (0-10000, where 10000 = 100%)
        bool isActive;               // Whether presale is active
        uint256 totalTokensSold;     // Total tokens sold
        uint256 totalPaymentRaised;  // Total payment tokens raised
        uint256 soldPercentage;      // Percentage of tokens sold (0-10000)
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
    function getSoldPercentage() external view returns (uint256);
    
    // User functions (for backward compatibility, buyTokens with paymentToken parameter is preferred)
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