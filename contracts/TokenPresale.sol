// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/ITokenPresale.sol";

/**
 * @title TokenPresale
 * @dev Implementation of a token presale with time-locked distribution
 * 
 * This contract allows users to buy tokens with USDC during a presale period.
 * The admin can control the unlock percentage, allowing for gradual token release.
 * 
 * Key features:
 * - Users buy tokens with USDC at a price set by admin
 * - Maximum buy limit per user to ensure fair distribution
 * - Time-locked distribution controlled by admin unlock percentages
 * - Secure handling of funds with emergency withdrawal capabilities
 * - Comprehensive event logging for transparency
 * 
 * Security considerations:
 * - Uses OpenZeppelin's ReentrancyGuard to prevent reentrancy attacks
 * - Pausable functionality for emergency stops
 * - Only owner can modify critical parameters
 * - Safe math operations to prevent overflow/underflow
 */
contract TokenPresale is ITokenPresale, Ownable, ReentrancyGuard, Pausable {
    
    // State variables
    IERC20 public immutable token;           // Token being sold
    IERC20 public immutable paymentToken;   // Payment token (USDC)
    
    uint256 public tokenPrice;               // Price per token in USDC (with 6 decimals for USDC)
    uint256 public maxBuyLimit;              // Maximum tokens a user can buy
    uint256 public currentUnlockPercentage;  // Current unlock percentage (0-10000, where 10000 = 100%)
    bool public isActive;                    // Whether presale is active
    uint256 public totalTokensSold;          // Total tokens sold
    uint256 public totalUsdcRaised;          // Total USDC raised
    
    // Mappings
    mapping(address => Purchase) public purchases;  // User purchases
    address[] public purchasersList;                // List of all purchasers
    mapping(address => bool) public hasPurchased;   // Track if user has purchased
    
    // Constants
    uint256 public constant PERCENTAGE_PRECISION = 10000; // 100% = 10000
    uint256 public constant USDC_DECIMALS = 6;
    
    /**
     * @dev Constructor initializes the presale with token and payment token
     * @param _token Address of the token being sold
     * @param _paymentToken Address of the payment token (USDC)
     * @param _tokenPrice Initial price per token in USDC (with 6 decimals)
     * @param _maxBuyLimit Maximum tokens a user can buy
     */
    constructor(
        address _token,
        address _paymentToken,
        uint256 _tokenPrice,
        uint256 _maxBuyLimit
    ) {
        require(_token != address(0), "Token address cannot be zero");
        require(_paymentToken != address(0), "Payment token address cannot be zero");
        require(_tokenPrice > 0, "Token price must be greater than zero");
        require(_maxBuyLimit > 0, "Max buy limit must be greater than zero");
        
        token = IERC20(_token);
        paymentToken = IERC20(_paymentToken);
        tokenPrice = _tokenPrice;
        maxBuyLimit = _maxBuyLimit;
        currentUnlockPercentage = 0;
        isActive = false;
        
        emit PresaleCreated(_token, _paymentToken, _tokenPrice, _maxBuyLimit);
    }
    
    /**
     * @dev Modifier to check if presale is active
     */
    modifier presaleActive() {
        require(isActive, "Presale is not active");
        _;
    }
    
    /**
     * @dev Returns complete presale information
     */
    function presaleInfo() external view override returns (PresaleInfo memory) {
        return PresaleInfo({
            token: address(token),
            paymentToken: address(paymentToken),
            tokenPrice: tokenPrice,
            maxBuyLimit: maxBuyLimit,
            currentUnlockPercentage: currentUnlockPercentage,
            isActive: isActive,
            totalTokensSold: totalTokensSold,
            totalUsdcRaised: totalUsdcRaised
        });
    }
    
    /**
     * @dev Returns user's purchase information
     * @param user Address of the user
     */
    function getUserPurchase(address user) external view override returns (Purchase memory) {
        return purchases[user];
    }
    
    /**
     * @dev Returns comprehensive token status for a user
     * @param user Address of the user
     * @return UserTokenStatus Complete token distribution information
     */
    function getUserTokenStatus(address user) external view override returns (UserTokenStatus memory) {
        Purchase memory userPurchase = purchases[user];
        
        uint256 totalUnlocked = getUnlockedAmount(user);
        uint256 totalLocked = getLockedAmount(user);
        uint256 claimable = getClaimableAmount(user);
        
        return UserTokenStatus({
            totalTokensBought: userPurchase.totalTokensBought,
            totalUnlockedTokens: totalUnlocked,
            totalClaimedTokens: userPurchase.totalClaimedTokens,
            totalLockedTokens: totalLocked,
            claimableTokens: claimable
        });
    }
    
    /**
     * @dev Calculates the amount of tokens a user can currently claim
     * @param user Address of the user
     * @return claimableAmount Amount of tokens that can be claimed
     */
    function getClaimableAmount(address user) public view override returns (uint256) {
        Purchase memory userPurchase = purchases[user];
        
        if (userPurchase.totalTokensBought == 0) {
            return 0;
        }
        
        // Calculate total unlocked tokens
        uint256 totalUnlockedTokens = (userPurchase.totalTokensBought * currentUnlockPercentage) / PERCENTAGE_PRECISION;
        
        // Calculate claimable amount (unlocked - already claimed)
        if (totalUnlockedTokens > userPurchase.totalClaimedTokens) {
            return totalUnlockedTokens - userPurchase.totalClaimedTokens;
        }
        
        return 0;
    }
    
    /**
     * @dev Returns the total amount of unlocked tokens for a user
     * @param user Address of the user
     * @return unlockedAmount Total unlocked tokens (regardless of claimed status)
     */
    function getUnlockedAmount(address user) public view override returns (uint256) {
        Purchase memory userPurchase = purchases[user];
        
        if (userPurchase.totalTokensBought == 0) {
            return 0;
        }
        
        return (userPurchase.totalTokensBought * currentUnlockPercentage) / PERCENTAGE_PRECISION;
    }
    
    /**
     * @dev Returns the amount of tokens still locked for a user
     * @param user Address of the user
     * @return lockedAmount Amount of tokens still locked
     */
    function getLockedAmount(address user) public view override returns (uint256) {
        Purchase memory userPurchase = purchases[user];
        
        if (userPurchase.totalTokensBought == 0) {
            return 0;
        }
        
        uint256 unlockedAmount = getUnlockedAmount(user);
        return userPurchase.totalTokensBought - unlockedAmount;
    }
    
    /**
     * @dev Returns the amount of tokens a user has already claimed
     * @param user Address of the user
     * @return claimedAmount Amount of tokens already claimed
     */
    function getClaimedAmount(address user) public view override returns (uint256) {
        return purchases[user].totalClaimedTokens;
    }
    
    /**
     * @dev Returns the total number of purchasers
     */
    function getTotalPurchasers() external view override returns (uint256) {
        return purchasersList.length;
    }
    
    /**
     * @dev Returns whether presale is active
     */
    function isPresaleActive() external view override returns (bool) {
        return isActive;
    }
    
    /**
     * @dev Allows users to buy tokens with USDC
     * @param usdcAmount Amount of USDC to spend
     */
    function buyTokens(uint256 usdcAmount) external override nonReentrant presaleActive {
        require(usdcAmount > 0, "USDC amount must be greater than zero");
        
        // Calculate token amount to buy
        uint256 tokenAmount = (usdcAmount * (10 ** ERC20(address(token)).decimals())) / tokenPrice;
        require(tokenAmount > 0, "Token amount must be greater than zero");
        
        // Check if user would exceed max buy limit
        Purchase storage userPurchase = purchases[msg.sender];
        require(
            userPurchase.totalTokensBought + tokenAmount <= maxBuyLimit,
            "Would exceed maximum buy limit"
        );
        
        // Check if contract has enough tokens
        require(
            token.balanceOf(address(this)) >= tokenAmount,
            "Insufficient tokens in presale contract"
        );
        
        // Transfer USDC from user to contract
        require(
            paymentToken.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );
        
        // Update user's purchase
        userPurchase.totalTokensBought += tokenAmount;
        userPurchase.usdcSpent += usdcAmount;
        
        // Add to purchasers list if first purchase
        if (!hasPurchased[msg.sender]) {
            purchasersList.push(msg.sender);
            hasPurchased[msg.sender] = true;
        }
        
        // Update global stats
        totalTokensSold += tokenAmount;
        totalUsdcRaised += usdcAmount;
        
        emit TokensPurchased(msg.sender, usdcAmount, tokenAmount);
    }
    
    /**
     * @dev Allows users to claim their unlocked tokens
     * Only tokens that are unlocked and not yet claimed can be claimed
     */
    function claimTokens() external override nonReentrant {
        uint256 claimableAmount = getClaimableAmount(msg.sender);
        require(claimableAmount > 0, "No tokens available to claim");
        
        // Update user's claimed tokens BEFORE transfer (reentrancy protection)
        purchases[msg.sender].totalClaimedTokens += claimableAmount;
        
        // Transfer tokens to user
        require(
            token.transfer(msg.sender, claimableAmount),
            "Token transfer failed"
        );
        
        emit TokensClaimed(msg.sender, claimableAmount);
    }
    
    /**
     * @dev Admin function to set token price
     * @param newPrice New price per token in USDC
     */
    function setTokenPrice(uint256 newPrice) external override onlyOwner {
        require(newPrice > 0, "Price must be greater than zero");
        tokenPrice = newPrice;
        emit TokenPriceUpdated(newPrice);
    }
    
    /**
     * @dev Admin function to set maximum buy limit
     * @param newLimit New maximum buy limit
     */
    function setMaxBuyLimit(uint256 newLimit) external override onlyOwner {
        require(newLimit > 0, "Limit must be greater than zero");
        maxBuyLimit = newLimit;
        emit MaxBuyLimitUpdated(newLimit);
    }
    
    /**
     * @dev Admin function to set unlock percentage
     * @param percentage New unlock percentage (0-10000, where 10000 = 100%)
     */
    function setUnlockPercentage(uint256 percentage) external override onlyOwner {
        require(percentage <= PERCENTAGE_PRECISION, "Percentage cannot exceed 100%");
        require(percentage >= currentUnlockPercentage, "Cannot decrease unlock percentage");
        
        currentUnlockPercentage = percentage;
        emit UnlockPercentageSet(percentage, block.timestamp);
    }
    
    /**
     * @dev Admin function to unlock all remaining tokens (100%)
     * This is a convenience function to immediately unlock all tokens
     */
    function unlockAllTokens() external override onlyOwner {
        currentUnlockPercentage = PERCENTAGE_PRECISION; // Set to 100%
        emit AllTokensUnlocked(block.timestamp);
        emit UnlockPercentageSet(PERCENTAGE_PRECISION, block.timestamp);
    }
    
    /**
     * @dev Admin function to activate/deactivate presale
     * @param status New presale status
     */
    function setPresaleStatus(bool status) external override onlyOwner {
        isActive = status;
        emit PresaleStatusChanged(status);
    }
    
    /**
     * @dev Admin function to stop the presale (convenience function)
     * This deactivates the presale and can be called in emergency situations
     */
    function stopPresale() external override onlyOwner {
        isActive = false;
        emit PresaleStatusChanged(false);
    }
    
    /**
     * @dev Admin function to withdraw USDC from contract
     * @param amount Amount of USDC to withdraw
     */
    function withdrawUSDC(uint256 amount) external override onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        require(
            paymentToken.balanceOf(address(this)) >= amount,
            "Insufficient USDC balance"
        );
        
        require(
            paymentToken.transfer(owner(), amount),
            "USDC transfer failed"
        );
        
        emit EmergencyWithdraw(owner(), amount);
    }
    
    /**
     * @dev Emergency function to withdraw tokens from contract
     * @param amount Amount of tokens to withdraw
     */
    function emergencyWithdrawTokens(uint256 amount) external override onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient token balance"
        );
        
        require(
            token.transfer(owner(), amount),
            "Token transfer failed"
        );
        
        emit EmergencyWithdraw(owner(), amount);
    }
    
    /**
     * @dev Admin function to add more tokens to the presale
     * @param amount Amount of tokens to add
     */
    function addTokensToPresale(uint256 amount) external override onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Returns the current token balance of the contract
     */
    function getContractTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
    
    /**
     * @dev Returns the current USDC balance of the contract
     */
    function getContractUsdcBalance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }
} 