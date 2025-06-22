// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/ITokenPresale.sol";

/**
 * @title TokenPresale
 * @dev Implementation of a token presale with time-locked distribution
 * 
 * This contract allows users to buy tokens with USDC or USDT during a presale period.
 * The admin can control the unlock percentage, allowing for gradual token release.
 * 
 * Key features:
 * - Users buy tokens with USDC or USDT at a price set by admin
 * - Minimum and maximum buy limits per user to ensure fair distribution
 * - Time-locked distribution controlled by admin unlock percentages
 * - Secure handling of funds with emergency withdrawal capabilities
 * - Comprehensive event logging for transparency
 * - Balance checking before and after transfers to prevent fee-on-transfer issues
 * 
 * Security considerations:
 * - Uses OpenZeppelin's ReentrancyGuard to prevent reentrancy attacks
 * - Pausable functionality for emergency stops
 * - Only owner can modify critical parameters
 * - Safe math operations to prevent overflow/underflow
 * - Balance validation before and after transfers
 */
contract TokenPresale is ITokenPresale, Ownable2Step, ReentrancyGuard, Pausable {
    
    // State variables
    IERC20 public immutable token;           // Token being sold
    IERC20 public immutable usdc;            // USDC payment token
    IERC20 public immutable usdt;            // USDT payment token
    
    uint256 public tokenPrice;               // Price per token in payment token (with 6 decimals for USDC/USDT)
    uint256 public minBuyLimit;              // Minimum payment amount per purchase
    uint256 public maxBuyLimit;              // Maximum payment amount per user total
    uint256 public totalTokensForSale;       // Total tokens available for sale
    uint256 public currentUnlockPercentage;  // Current unlock percentage (0-10000, where 10000 = 100%)
    bool public isActive;                    // Whether presale is active
    uint256 public totalTokensSold;          // Total tokens sold
    uint256 public totalPaymentRaised;       // Total payment tokens raised (USDC + USDT)
    
    // Mappings
    mapping(address => Purchase) public purchases;      // User purchases
    mapping(address => bool) public acceptedPayments;   // Accepted payment tokens
    address[] public purchasersList;                    // List of all purchasers
    mapping(address => bool) public hasPurchased;       // Track if user has purchased
    
    // Constants
    uint256 private constant PERCENTAGE_PRECISION = 10000; // 100% = 10000
    uint256 private constant PAYMENT_DECIMALS = 6;         // USDC and USDT have 6 decimals
    
    /**
     * @dev Constructor initializes the presale with token and payment tokens
     * @param _token Address of the token being sold
     * @param _usdc Address of USDC token
     * @param _usdt Address of USDT token
     * @param _tokenPrice Initial price per token in payment token (with 6 decimals)
     * @param _minBuyLimit Minimum payment amount per purchase
     * @param _maxBuyLimit Maximum payment amount per user total
     * @param _totalTokensForSale Total tokens available for sale
     */
    constructor(
        address _token,
        address _usdc,
        address _usdt,
        uint256 _tokenPrice,
        uint256 _minBuyLimit,
        uint256 _maxBuyLimit,
        uint256 _totalTokensForSale
    ) payable {
        require(_token != address(0), "Token address cannot be zero");
        require(_usdc != address(0), "USDC address cannot be zero");
        require(_usdt != address(0), "USDT address cannot be zero");
        require(_tokenPrice != 0, "Token price must be greater than zero");
        require(_minBuyLimit != 0, "Min buy limit must be greater than zero");
        require(_maxBuyLimit != 0, "Max buy limit must be greater than zero");
        require(_maxBuyLimit > _minBuyLimit, "Max buy limit must be greater than min buy limit");
        require(_totalTokensForSale != 0, "Total tokens for sale must be greater than zero");
        
        token = IERC20(_token);
        usdc = IERC20(_usdc);
        usdt = IERC20(_usdt);
        tokenPrice = _tokenPrice;
        minBuyLimit = _minBuyLimit;
        maxBuyLimit = _maxBuyLimit;
        totalTokensForSale = _totalTokensForSale;
        currentUnlockPercentage = 0;
        isActive = false;
        
        // Set accepted payment tokens
        acceptedPayments[_usdc] = true;
        acceptedPayments[_usdt] = true;
        
        emit PresaleCreated(_token, _usdc, _tokenPrice, _minBuyLimit, _maxBuyLimit, _totalTokensForSale);
        emit PaymentTokenAdded(_usdc);
        emit PaymentTokenAdded(_usdt);
    }
    
    /**
     * @dev Modifier to check if presale is active
     */
    modifier presaleActive() {
        require(isActive, "Presale is not active");
        _;
    }
    
    /**
     * @dev Modifier to check if payment token is accepted
     */
    modifier validPaymentToken(address _paymentToken) {
        require(acceptedPayments[_paymentToken], "Payment token not accepted");
        _;
    }
    
    /**
     * @dev Returns complete presale information
     */
    function presaleInfo() external view override returns (PresaleInfo memory) {
        return PresaleInfo({
            token: address(token),
            paymentToken: address(usdc), // For backward compatibility
            tokenPrice: tokenPrice,
            minBuyLimit: minBuyLimit,
            maxBuyLimit: maxBuyLimit,
            totalTokensForSale: totalTokensForSale,
            currentUnlockPercentage: currentUnlockPercentage,
            isActive: isActive,
            totalTokensSold: totalTokensSold,
            totalPaymentRaised: totalPaymentRaised
        });
    }
    
    /**
     * @dev Returns extended presale information including all payment tokens
     */
    function getExtendedPresaleInfo() external view returns (ExtendedPresaleInfo memory) {
        return ExtendedPresaleInfo({
            token: address(token),
            usdc: address(usdc),
            usdt: address(usdt),
            tokenPrice: tokenPrice,
            minBuyLimit: minBuyLimit,
            maxBuyLimit: maxBuyLimit,
            totalTokensForSale: totalTokensForSale,
            currentUnlockPercentage: currentUnlockPercentage,
            isActive: isActive,
            totalTokensSold: totalTokensSold,
            totalPaymentRaised: totalPaymentRaised,
            soldPercentage: getSoldPercentage()
        });
    }
    
    /**
     * @dev Returns the percentage of tokens sold
     * @return percentage Percentage of tokens sold (0-10000, where 10000 = 100%)
     */
    function getSoldPercentage() public view returns (uint256) {
        if (totalTokensForSale == 0) return 0;
        return (totalTokensSold * PERCENTAGE_PRECISION) / totalTokensForSale;
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
     * @dev Allows users to buy tokens with USDC or USDT
     * @param paymentToken Address of payment token (USDC or USDT)
     * @param paymentAmount Amount of payment token to spend
     */
    function buyTokens(address paymentToken, uint256 paymentAmount) external nonReentrant presaleActive validPaymentToken(paymentToken) whenNotPaused {
        require(paymentAmount >= minBuyLimit, "Payment amount below minimum limit");
        require(paymentAmount != 0, "Payment amount must be greater than zero");
        
        Purchase storage userPurchase = purchases[msg.sender];
        
        // Check if user would exceed max buy limit (total payment amount)
        require(
            userPurchase.paymentSpent + paymentAmount <= maxBuyLimit,
            "Would exceed maximum buy limit"
        );
        
        // Calculate token amount to buy
        uint256 tokenDecimals = ERC20(address(token)).decimals();
        uint256 tokenAmount = (paymentAmount * (10 ** tokenDecimals)) / tokenPrice;
        require(tokenAmount != 0, "Token amount must be greater than zero");
        
        // Check if there are enough tokens available for sale
        require(
            totalTokensSold + tokenAmount <= totalTokensForSale,
            "Would exceed total tokens for sale"
        );
        
        // Check if contract has enough tokens
        require(
            token.balanceOf(address(this)) >= tokenAmount,
            "Insufficient tokens in presale contract"
        );
        
        // Get balance before transfer to handle fee-on-transfer tokens
        uint256 preBalance = IERC20(paymentToken).balanceOf(address(this));
        
        // Transfer payment token from user to contract
        require(
            IERC20(paymentToken).transferFrom(msg.sender, address(this), paymentAmount),
            "Payment transfer failed"
        );
        
        // Get balance after transfer and calculate actual received amount
        uint256 postBalance = IERC20(paymentToken).balanceOf(address(this));
        uint256 actualReceived = postBalance - preBalance;
        
        // Recalculate token amount based on actual received amount
        uint256 actualTokenAmount = (actualReceived * (10 ** tokenDecimals)) / tokenPrice;
        
        // Update user's purchase
        userPurchase.totalTokensBought += actualTokenAmount;
        userPurchase.paymentSpent += actualReceived;
        
        // Add to purchasers list if first purchase
        if (!hasPurchased[msg.sender]) {
            purchasersList.push(msg.sender);
            hasPurchased[msg.sender] = true;
        }
        
        // Update global stats
        totalTokensSold += actualTokenAmount;
        totalPaymentRaised += actualReceived;
        
        emit TokensPurchased(msg.sender, paymentToken, actualReceived, actualTokenAmount);
    }
    
    /**
     * @dev Allows users to claim their unlocked tokens
     * Only tokens that are unlocked and not yet claimed can be claimed
     */
    function claimTokens() external override nonReentrant whenNotPaused {
        uint256 claimableAmount = getClaimableAmount(msg.sender);
        require(claimableAmount != 0, "No tokens available to claim");
        
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
     * @param newPrice New price per token in payment token
     */
    function setTokenPrice(uint256 newPrice) external override onlyOwner {
        require(newPrice != 0, "Price must be greater than zero");
        tokenPrice = newPrice;
        emit TokenPriceUpdated(newPrice);
    }
    
    /**
     * @dev Admin function to set minimum buy limit
     * @param newLimit New minimum buy limit
     */
    function setMinBuyLimit(uint256 newLimit) external onlyOwner {
        require(newLimit != 0, "Limit must be greater than zero");
        require(newLimit < maxBuyLimit, "Min limit must be less than max limit");
        minBuyLimit = newLimit;
        emit MinBuyLimitUpdated(newLimit);
    }
    
    /**
     * @dev Admin function to set maximum buy limit
     * @param newLimit New maximum buy limit
     */
    function setMaxBuyLimit(uint256 newLimit) external override onlyOwner {
        require(newLimit != 0, "Limit must be greater than zero");
        require(newLimit > minBuyLimit, "Max limit must be greater than min limit");
        maxBuyLimit = newLimit;
        emit MaxBuyLimitUpdated(newLimit);
    }
    
    /**
     * @dev Admin function to set total tokens for sale
     * @param newTotal New total tokens for sale
     */
    function setTotalTokensForSale(uint256 newTotal) external onlyOwner {
        require(newTotal >= totalTokensSold, "Cannot set below tokens already sold");
        totalTokensForSale = newTotal;
        emit TotalTokensForSaleUpdated(newTotal);
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
     * @dev Admin function to withdraw payment tokens from contract
     * @param paymentToken Address of payment token to withdraw
     * @param amount Amount of payment token to withdraw
     */
    function withdrawPaymentToken(address paymentToken, uint256 amount) public onlyOwner validPaymentToken(paymentToken) {
        require(amount != 0, "Amount must be greater than zero");
        require(
            IERC20(paymentToken).balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );
        
        require(
            IERC20(paymentToken).transfer(owner(), amount),
            "Transfer failed"
        );
        
        emit PaymentWithdrawn(paymentToken, owner(), amount);
    }
    
    /**
     * @dev Admin function to withdraw USDC from contract (backward compatibility)
     * @param amount Amount of USDC to withdraw
     */
    function withdrawUSDC(uint256 amount) external override onlyOwner {
        withdrawPaymentToken(address(usdc), amount);
    }
    
    /**
     * @dev Emergency function to withdraw tokens from contract
     * @param amount Amount of tokens to withdraw
     */
    function emergencyWithdrawTokens(uint256 amount) external override onlyOwner {
        require(amount != 0, "Amount must be greater than zero");
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
        require(amount != 0, "Amount must be greater than zero");
        
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        emit TokensAddedToPresale(amount);
    }
    
    /**
     * @dev Admin function to add a new payment token
     * @param paymentToken Address of new payment token
     */
    function addPaymentToken(address paymentToken) external onlyOwner {
        require(paymentToken != address(0), "Payment token address cannot be zero");
        require(!acceptedPayments[paymentToken], "Payment token already accepted");
        
        acceptedPayments[paymentToken] = true;
        emit PaymentTokenAdded(paymentToken);
    }
    
    /**
     * @dev Admin function to remove a payment token
     * @param paymentToken Address of payment token to remove
     */
    function removePaymentToken(address paymentToken) external onlyOwner {
        require(acceptedPayments[paymentToken], "Payment token not accepted");
        require(paymentToken != address(usdc) && paymentToken != address(usdt), "Cannot remove core payment tokens");
        
        acceptedPayments[paymentToken] = false;
        emit PaymentTokenRemoved(paymentToken);
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external payable onlyOwner {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function
     */
    function unpause() external payable onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Returns the current token balance of the contract
     */
    function getContractTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
    
    /**
     * @dev Returns the current payment token balance of the contract
     * @param paymentToken Address of payment token
     */
    function getContractPaymentBalance(address paymentToken) external view returns (uint256) {
        return IERC20(paymentToken).balanceOf(address(this));
    }
    
    /**
     * @dev Returns the current USDC balance of the contract (backward compatibility)
     */
    function getContractUsdcBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
    
    /**
     * @dev Returns whether a payment token is accepted
     * @param paymentToken Address of payment token
     */
    function isPaymentTokenAccepted(address paymentToken) external view returns (bool) {
        return acceptedPayments[paymentToken];
    }
} 