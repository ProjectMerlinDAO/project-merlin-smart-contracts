// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/ILotteryPresale.sol";

/**
 * @title LotteryPresale
 * @dev Implementation of a presale with both regular and lottery modes
 * 
 * Features:
 * - Regular presale: Users buy tokens directly with USDC
 * - Lottery presale: Users participate in a draw, winners get tokens
 * - Time-based duration for both modes
 * - Admin-controlled winner selection for lottery
 * - Refund mechanism for lottery losers
 * - Progressive token unlocking system
 */
contract LotteryPresale is ILotteryPresale, Ownable, ReentrancyGuard, Pausable {
    
    // State variables
    IERC20 public immutable token;           // Token being sold
    IERC20 public immutable paymentToken;   // Payment token (USDC)
    
    uint256 public tokenPrice;               // Price per token in USDC
    uint256 public maxBuyLimit;              // Maximum tokens/USDC a user can contribute
    uint256 public currentUnlockPercentage;  // Current unlock percentage (0-10000)
    PresaleType public presaleType;          // REGULAR or LOTTERY
    PresaleStatus public status;             // Current status
    uint256 public duration;                 // Duration in seconds
    uint256 public startTime;                // Start timestamp
    uint256 public endTime;                  // End timestamp
    uint256 public totalTokensSold;          // Total tokens sold/distributed
    uint256 public totalUsdcRaised;          // Total USDC raised
    uint256 public selectedWinners;          // Number of selected winners
    
    // Mappings
    mapping(address => Purchase) public purchases;              // User purchases
    mapping(address => LotteryParticipation) public lotteryParticipants; // Lottery participants
    address[] public participantsList;                         // List of all participants
    address[] public winnersList;                              // List of winners (lottery only)
    mapping(address => bool) public hasParticipated;           // Track if user has participated
    mapping(address => bool) public isWinner;                  // Track if user is winner
    
    // Constants
    uint256 public constant PERCENTAGE_PRECISION = 10000; // 100% = 10000
    uint256 public constant USDC_DECIMALS = 6;
    
    /**
     * @dev Constructor initializes the presale
     */
    constructor(
        address _token,
        address _paymentToken,
        uint256 _tokenPrice,
        uint256 _maxBuyLimit,
        PresaleType _presaleType,
        uint256 _duration
    ) {
        require(_token != address(0), "Token address cannot be zero");
        require(_paymentToken != address(0), "Payment token address cannot be zero");
        require(_tokenPrice > 0, "Token price must be greater than zero");
        require(_maxBuyLimit > 0, "Max buy limit must be greater than zero");
        require(_duration > 0, "Duration must be greater than zero");
        
        token = IERC20(_token);
        paymentToken = IERC20(_paymentToken);
        tokenPrice = _tokenPrice;
        maxBuyLimit = _maxBuyLimit;
        presaleType = _presaleType;
        duration = _duration;
        startTime = block.timestamp;
        endTime = block.timestamp + _duration;
        status = PresaleStatus.ACTIVE;
        currentUnlockPercentage = 0;
        
        emit PresaleCreated(_token, _paymentToken, _tokenPrice, _maxBuyLimit, _presaleType, _duration, endTime);
    }
    
    /**
     * @dev Modifier to check if presale is active and not ended
     */
    modifier presaleActive() {
        require(status == PresaleStatus.ACTIVE, "Presale is not active");
        require(block.timestamp < endTime, "Presale has ended");
        _;
    }
    
    /**
     * @dev Modifier to check if presale has ended
     */
    modifier presaleEnded() {
        require(block.timestamp >= endTime || status == PresaleStatus.ENDED, "Presale has not ended yet");
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
            presaleType: presaleType,
            status: status,
            duration: duration,
            startTime: startTime,
            endTime: endTime,
            totalTokensSold: totalTokensSold,
            totalUsdcRaised: totalUsdcRaised,
            totalParticipants: participantsList.length,
            selectedWinners: selectedWinners
        });
    }
    
    /**
     * @dev Returns user's purchase information
     */
    function getUserPurchase(address user) external view override returns (Purchase memory) {
        return purchases[user];
    }
    
    /**
     * @dev Returns user's lottery participation information
     */
    function getLotteryParticipation(address user) external view override returns (LotteryParticipation memory) {
        return lotteryParticipants[user];
    }
    
    /**
     * @dev Returns comprehensive token status for a user
     */
    function getUserTokenStatus(address user) external view override returns (UserTokenStatus memory) {
        Purchase memory userPurchase = purchases[user];
        
        uint256 totalUnlocked = getUnlockedAmount(user);
        uint256 totalLocked = getLockedAmount(user);
        uint256 claimable = getClaimableAmount(user);
        uint256 refundable = getRefundableAmount(user);
        
        return UserTokenStatus({
            totalTokensBought: userPurchase.totalTokensBought,
            totalUnlockedTokens: totalUnlocked,
            totalClaimedTokens: userPurchase.totalClaimedTokens,
            totalLockedTokens: totalLocked,
            claimableTokens: claimable,
            isWinner: userPurchase.isWinner,
            refundableAmount: refundable
        });
    }
    
    /**
     * @dev Calculates the amount of tokens a user can currently claim
     */
    function getClaimableAmount(address user) public view override returns (uint256) {
        Purchase memory userPurchase = purchases[user];
        
        if (userPurchase.totalTokensBought == 0) {
            return 0;
        }
        
        uint256 totalUnlockedTokens = (userPurchase.totalTokensBought * currentUnlockPercentage) / PERCENTAGE_PRECISION;
        
        if (totalUnlockedTokens > userPurchase.totalClaimedTokens) {
            return totalUnlockedTokens - userPurchase.totalClaimedTokens;
        }
        
        return 0;
    }
    
    /**
     * @dev Returns the total amount of unlocked tokens for a user
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
     */
    function getClaimedAmount(address user) public view override returns (uint256) {
        return purchases[user].totalClaimedTokens;
    }
    
    /**
     * @dev Returns the amount of USDC a user can refund (lottery losers only)
     */
    function getRefundableAmount(address user) public view override returns (uint256) {
        if (presaleType != PresaleType.LOTTERY) {
            return 0;
        }
        
        LotteryParticipation memory participation = lotteryParticipants[user];
        
        // Only non-winners can get refunds, and only if they haven't claimed yet
        if (!participation.isSelected && !participation.hasClaimedRefund && participation.usdcContributed > 0) {
            return participation.usdcContributed;
        }
        
        return 0;
    }
    
    /**
     * @dev Returns the total number of participants
     */
    function getTotalParticipants() external view override returns (uint256) {
        return participantsList.length;
    }
    
    /**
     * @dev Returns the list of winners (lottery only)
     */
    function getWinners() external view override returns (address[] memory) {
        return winnersList;
    }
    
    /**
     * @dev Returns whether presale is active
     */
    function isPresaleActive() external view override returns (bool) {
        return status == PresaleStatus.ACTIVE && block.timestamp < endTime;
    }
    
    /**
     * @dev Returns whether presale has ended
     */
    function isPresaleEnded() external view override returns (bool) {
        return block.timestamp >= endTime || status == PresaleStatus.ENDED;
    }
    
    /**
     * @dev Returns whether winners can be selected (lottery only)
     */
    function canSelectWinners() external view override returns (bool) {
        return presaleType == PresaleType.LOTTERY && 
               (block.timestamp >= endTime || status == PresaleStatus.ENDED) &&
               status != PresaleStatus.WINNERS_SELECTED &&
               status != PresaleStatus.COMPLETED;
    }
    
    /**
     * @dev Returns remaining time in seconds
     */
    function getRemainingTime() external view override returns (uint256) {
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }
    
    /**
     * @dev Allows users to buy tokens (regular presale only)
     */
    function buyTokens(uint256 usdcAmount) external override nonReentrant presaleActive {
        require(presaleType == PresaleType.REGULAR, "Use participateInLottery for lottery presale");
        require(usdcAmount > 0, "USDC amount must be greater than zero");
        
        uint256 tokenAmount = (usdcAmount * (10 ** ERC20(address(token)).decimals())) / tokenPrice;
        require(tokenAmount > 0, "Token amount must be greater than zero");
        
        Purchase storage userPurchase = purchases[msg.sender];
        require(
            userPurchase.totalTokensBought + tokenAmount <= maxBuyLimit,
            "Would exceed maximum buy limit"
        );
        
        require(
            token.balanceOf(address(this)) >= tokenAmount,
            "Insufficient tokens in presale contract"
        );
        
        require(
            paymentToken.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );
        
        userPurchase.totalTokensBought += tokenAmount;
        userPurchase.usdcSpent += usdcAmount;
        
        if (!hasParticipated[msg.sender]) {
            participantsList.push(msg.sender);
            hasParticipated[msg.sender] = true;
        }
        
        totalTokensSold += tokenAmount;
        totalUsdcRaised += usdcAmount;
        
        emit TokensPurchased(msg.sender, usdcAmount, tokenAmount);
    }
    
    /**
     * @dev Allows users to participate in lottery
     */
    function participateInLottery(uint256 usdcAmount) external override nonReentrant presaleActive {
        require(presaleType == PresaleType.LOTTERY, "Use buyTokens for regular presale");
        require(usdcAmount > 0, "USDC amount must be greater than zero");
        
        LotteryParticipation storage participation = lotteryParticipants[msg.sender];
        require(
            participation.usdcContributed + usdcAmount <= maxBuyLimit,
            "Would exceed maximum contribution limit"
        );
        
        require(
            paymentToken.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );
        
        participation.usdcContributed += usdcAmount;
        
        if (!hasParticipated[msg.sender]) {
            participantsList.push(msg.sender);
            hasParticipated[msg.sender] = true;
        }
        
        totalUsdcRaised += usdcAmount;
        
        emit LotteryParticipant(msg.sender, usdcAmount);
    }
    
    /**
     * @dev Allows users to claim their unlocked tokens
     */
    function claimTokens() external override nonReentrant {
        uint256 claimableAmount = getClaimableAmount(msg.sender);
        require(claimableAmount > 0, "No tokens available to claim");
        
        purchases[msg.sender].totalClaimedTokens += claimableAmount;
        
        require(
            token.transfer(msg.sender, claimableAmount),
            "Token transfer failed"
        );
        
        emit TokensClaimed(msg.sender, claimableAmount);
    }
    
    /**
     * @dev Allows lottery losers to claim refunds
     */
    function claimRefund() external override nonReentrant {
        require(presaleType == PresaleType.LOTTERY, "Refunds only available for lottery");
        require(status == PresaleStatus.WINNERS_SELECTED || status == PresaleStatus.COMPLETED, "Winners not selected yet");
        
        uint256 refundAmount = getRefundableAmount(msg.sender);
        require(refundAmount > 0, "No refund available");
        
        lotteryParticipants[msg.sender].hasClaimedRefund = true;
        
        require(
            paymentToken.transfer(msg.sender, refundAmount),
            "USDC transfer failed"
        );
        
        emit RefundIssued(msg.sender, refundAmount);
    }
    
    /**
     * @dev Admin function to select winners (lottery only)
     */
    function selectWinners(address[] calldata winners) external override onlyOwner presaleEnded {
        require(presaleType == PresaleType.LOTTERY, "Only for lottery presale");
        require(status == PresaleStatus.ENDED || status == PresaleStatus.ACTIVE, "Winners already selected");
        require(winners.length > 0, "Must select at least one winner");
        
        // Validate all winners are participants
        for (uint256 i = 0; i < winners.length; i++) {
            require(hasParticipated[winners[i]], "Winner must be a participant");
            require(lotteryParticipants[winners[i]].usdcContributed > 0, "Winner must have contributed");
        }
        
        // Clear previous winners if any
        delete winnersList;
        selectedWinners = 0;
        
        // Set new winners
        for (uint256 i = 0; i < winners.length; i++) {
            address winner = winners[i];
            if (!isWinner[winner]) {  // Avoid duplicates
                winnersList.push(winner);
                isWinner[winner] = true;
                lotteryParticipants[winner].isSelected = true;
                purchases[winner].isWinner = true;
                selectedWinners++;
            }
        }
        
        status = PresaleStatus.WINNERS_SELECTED;
        emit WinnersSelected(winners, selectedWinners, block.timestamp);
        emit PresaleStatusChanged(status);
    }
    
    /**
     * @dev Admin function to distribute tokens to winners (lottery only)
     */
    function distributeTokensToWinners() external override onlyOwner {
        require(presaleType == PresaleType.LOTTERY, "Only for lottery presale");
        require(status == PresaleStatus.WINNERS_SELECTED, "Winners not selected yet");
        require(winnersList.length > 0, "No winners selected");
        
        uint256 totalTokensToDistribute = (totalUsdcRaised * (10 ** ERC20(address(token)).decimals())) / tokenPrice;
        uint256 tokensPerWinner = totalTokensToDistribute / winnersList.length;
        
        require(
            token.balanceOf(address(this)) >= totalTokensToDistribute,
            "Insufficient tokens in contract"
        );
        
        for (uint256 i = 0; i < winnersList.length; i++) {
            address winner = winnersList[i];
            purchases[winner].totalTokensBought = tokensPerWinner;
            purchases[winner].usdcSpent = lotteryParticipants[winner].usdcContributed;
            
            emit TokensDistributed(winner, tokensPerWinner);
        }
        
        totalTokensSold = totalTokensToDistribute;
        status = PresaleStatus.COMPLETED;
        emit PresaleStatusChanged(status);
    }
    
    /**
     * @dev Admin function to end presale manually
     */
    function endPresale() external override onlyOwner {
        require(status == PresaleStatus.ACTIVE, "Presale already ended");
        status = PresaleStatus.ENDED;
        emit PresaleStatusChanged(status);
    }
    
    /**
     * @dev Admin function to set token price
     */
    function setTokenPrice(uint256 newPrice) external override onlyOwner {
        require(newPrice > 0, "Price must be greater than zero");
        tokenPrice = newPrice;
        emit TokenPriceUpdated(newPrice);
    }
    
    /**
     * @dev Admin function to set maximum buy limit
     */
    function setMaxBuyLimit(uint256 newLimit) external override onlyOwner {
        require(newLimit > 0, "Limit must be greater than zero");
        maxBuyLimit = newLimit;
        emit MaxBuyLimitUpdated(newLimit);
    }
    
    /**
     * @dev Admin function to set unlock percentage
     */
    function setUnlockPercentage(uint256 percentage) external override onlyOwner {
        require(percentage <= PERCENTAGE_PRECISION, "Percentage cannot exceed 100%");
        require(percentage >= currentUnlockPercentage, "Cannot decrease unlock percentage");
        
        currentUnlockPercentage = percentage;
        emit UnlockPercentageSet(percentage, block.timestamp);
    }
    
    /**
     * @dev Admin function to unlock all tokens
     */
    function unlockAllTokens() external override onlyOwner {
        currentUnlockPercentage = PERCENTAGE_PRECISION;
        emit AllTokensUnlocked(block.timestamp);
        emit UnlockPercentageSet(PERCENTAGE_PRECISION, block.timestamp);
    }
    
    /**
     * @dev Admin function to withdraw USDC
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
     * @dev Admin function to withdraw tokens
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
     * @dev Admin function to add tokens to presale
     */
    function addTokensToPresale(uint256 amount) external override onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
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