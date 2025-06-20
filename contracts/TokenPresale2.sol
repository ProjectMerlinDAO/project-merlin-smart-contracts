// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/ITokenPresale.sol";

contract TokenPresale is ITokenPresale, Ownable2Step, ReentrancyGuard, Pausable {
    IERC20 public immutable token;
    IERC20 public immutable paymentToken;

    uint256 public tokenPrice;
    uint256 public maxBuyLimit;
    uint256 public currentUnlockPercentage;
    bool public isActive;
    uint256 public totalTokensSold;
    uint256 public totalUsdcRaised;

    mapping(address => Purchase) public purchases;
    address[] public purchasersList;
    mapping(address => bool) public hasPurchased;

    uint256 private constant PERCENTAGE_PRECISION = 10000;
    uint256 private constant USDC_DECIMALS = 6;

    constructor(
        address _token,
        address _paymentToken,
        uint256 _tokenPrice,
        uint256 _maxBuyLimit
    ) payable {
        require(_token != address(0), "Token address cannot be zero");
        require(_paymentToken != address(0), "Payment token address cannot be zero");
        require(_tokenPrice != 0, "Token price must be greater than zero");
        require(_maxBuyLimit != 0, "Max buy limit must be greater than zero");

        token = IERC20(_token);
        paymentToken = IERC20(_paymentToken);
        tokenPrice = _tokenPrice;
        maxBuyLimit = _maxBuyLimit;
        currentUnlockPercentage = 0;
        isActive = false;

        emit PresaleCreated(_token, _paymentToken, _tokenPrice, _maxBuyLimit);
    }

    modifier presaleActive() {
        require(isActive, "Presale is not active");
        _;
    }

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

    function getUserPurchase(address user) external view override returns (Purchase memory) {
        return purchases[user];
    }

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

    function getClaimableAmount(address user) public view override returns (uint256) {
        Purchase memory userPurchase = purchases[user];
        if (userPurchase.totalTokensBought == 0) return 0;

        uint256 totalUnlockedTokens = (userPurchase.totalTokensBought * currentUnlockPercentage) / PERCENTAGE_PRECISION;
        if (totalUnlockedTokens > userPurchase.totalClaimedTokens) {
            return totalUnlockedTokens - userPurchase.totalClaimedTokens;
        }
        return 0;
    }

    function getUnlockedAmount(address user) public view override returns (uint256) {
        Purchase memory userPurchase = purchases[user];
        if (userPurchase.totalTokensBought == 0) return 0;
        return (userPurchase.totalTokensBought * currentUnlockPercentage) / PERCENTAGE_PRECISION;
    }

    function getLockedAmount(address user) public view override returns (uint256) {
        Purchase memory userPurchase = purchases[user];
        if (userPurchase.totalTokensBought == 0) return 0;
        return userPurchase.totalTokensBought - getUnlockedAmount(user);
    }

    function getClaimedAmount(address user) public view override returns (uint256) {
        return purchases[user].totalClaimedTokens;
    }

    function getTotalPurchasers() external view override returns (uint256) {
        return purchasersList.length;
    }

    function isPresaleActive() external view override returns (bool) {
        return isActive;
    }

    function buyTokens(uint256 usdcAmount) external override nonReentrant presaleActive {
        require(usdcAmount != 0, "USDC amount must be greater than zero");

        uint256 tokenDecimals = ERC20(address(token)).decimals();
        uint256 tokenAmount = (usdcAmount * (10 ** tokenDecimals)) / tokenPrice;
        require(tokenAmount != 0, "Token amount must be greater than zero");

        Purchase storage userPurchase = purchases[msg.sender];
        require(
            userPurchase.totalTokensBought + tokenAmount <= maxBuyLimit,
            "Would exceed maximum buy limit"
        );
        require(token.balanceOf(address(this)) >= tokenAmount, "Insufficient tokens in contract");

        userPurchase.totalTokensBought += tokenAmount;
        userPurchase.usdcSpent += usdcAmount;

        if (!hasPurchased[msg.sender]) {
            purchasersList.push(msg.sender);
            hasPurchased[msg.sender] = true;
        }

        totalTokensSold += tokenAmount;
        totalUsdcRaised += usdcAmount;

        require(
            paymentToken.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );

        emit TokensPurchased(msg.sender, usdcAmount, tokenAmount);
    }

    function claimTokens() external override nonReentrant {
        uint256 claimableAmount = getClaimableAmount(msg.sender);
        require(claimableAmount != 0, "No tokens available to claim");
        purchases[msg.sender].totalClaimedTokens += claimableAmount;
        require(token.transfer(msg.sender, claimableAmount), "Token transfer failed");
        emit TokensClaimed(msg.sender, claimableAmount);
    }

    function setTokenPrice(uint256 newPrice) external override onlyOwner {
        require(newPrice != 0, "Price must be greater than zero");
        tokenPrice = newPrice;
        emit TokenPriceUpdated(newPrice);
    }

    function setMaxBuyLimit(uint256 newLimit) external override onlyOwner {
        require(newLimit != 0, "Limit must be greater than zero");
        maxBuyLimit = newLimit;
        emit MaxBuyLimitUpdated(newLimit);
    }

    function setUnlockPercentage(uint256 percentage) external override onlyOwner {
        require(percentage <= PERCENTAGE_PRECISION, "Percentage cannot exceed 100%");
        require(percentage >= currentUnlockPercentage, "Cannot decrease unlock percentage");
        currentUnlockPercentage = percentage;
        emit UnlockPercentageSet(percentage, block.timestamp);
    }

    function unlockAllTokens() external override onlyOwner {
        currentUnlockPercentage = PERCENTAGE_PRECISION;
        emit AllTokensUnlocked(block.timestamp);
        emit UnlockPercentageSet(PERCENTAGE_PRECISION, block.timestamp);
    }

    function setPresaleStatus(bool status) external override onlyOwner {
        isActive = status;
        emit PresaleStatusChanged(status);
    }

    function stopPresale() external override onlyOwner {
        isActive = false;
        emit PresaleStatusChanged(false);
    }

    function withdrawUSDC(uint256 amount) external override onlyOwner {
        require(amount != 0, "Amount must be greater than zero");
        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance >= amount, "Insufficient USDC balance");
        require(paymentToken.transfer(owner(), amount), "USDC transfer failed");
        emit EmergencyWithdraw(owner(), amount);
    }

    function emergencyWithdrawTokens(uint256 amount) external override onlyOwner {
        require(amount != 0, "Amount must be greater than zero");
        uint256 balance = token.balanceOf(address(this));
        require(balance >= amount, "Insufficient token balance");
        require(token.transfer(owner(), amount), "Token transfer failed");
        emit EmergencyWithdraw(owner(), amount);
    }

    function addTokensToPresale(uint256 amount) external override onlyOwner {
        require(amount != 0, "Amount must be greater than zero");
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
    }

    function pause() external payable onlyOwner {
        _pause();
    }

    function unpause() external payable onlyOwner {
        _unpause();
    }

    function getContractTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getContractUsdcBalance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }
}
