// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/ITokenLaunchpad.sol";

/**
 * @title TokenLaunchpad
 * @dev Contract for managing token sales and releases in Project Merlin
 *
 * This contract manages:
 * - Fixed price token sales in ETH
 * - Token rights tracking
 * - Percentage-based token releases
 * - Token claims by buyers
 *
 * Security considerations:
 * - Reentrancy protection
 * - Owner-only critical functions
 * - Pausable for emergencies
 * - Safe token transfers
 * - Precise calculations
 */
contract TokenLaunchpad is ITokenLaunchpad, Ownable, ReentrancyGuard, Pausable {
    // Token configuration
    IERC20 private immutable _token;
    uint256 public immutable override tokenPriceInWei; // Price of 1 token in Wei
    uint256 public immutable override totalTokensForSale;
    uint256 public override tokensSold;
    
    // Release tracking
    uint256 public override releasedPercentage; // Percentage of tokens released (1-100)
    mapping(address => uint256) public override tokenRights; // How many tokens each buyer has rights to
    mapping(address => uint256) public override claimedTokens; // How many tokens each buyer has claimed
    
    /**
     * @dev Constructor sets up the launchpad with token and price configuration
     * @param tokenContract Address of the MRLN token
     * @param _priceInWei Price of 1 token in Wei (e.g., 1 ether for 1:1 ratio)
     * @param _totalTokensForSale Total number of tokens available for sale
     */
    constructor(
        address tokenContract,
        uint256 _priceInWei,
        uint256 _totalTokensForSale
    ) {
        require(tokenContract != address(0), "Invalid token address");
        require(_priceInWei > 0, "Price must be positive");
        require(_totalTokensForSale > 0, "Must sell some tokens");
        
        _token = IERC20(tokenContract);
        tokenPriceInWei = _priceInWei;
        totalTokensForSale = _totalTokensForSale;
        releasedPercentage = 0;
    }

    /**
     * @dev Returns the token contract address
     */
    function token() external view override returns (address) {
        return address(_token);
    }
    
    /**
     * @dev Allows users to buy token rights with ETH
     * @notice Tokens are not transferred immediately, only rights are granted
     */
    function buyTokens() external payable override nonReentrant whenNotPaused {
        require(msg.value > 0, "Must send ETH");
        
        // Calculate how many tokens the sent ETH can buy
        uint256 tokenAmount = (msg.value * 1e18) / tokenPriceInWei;
        require(tokenAmount > 0, "Must buy at least 1 token");
        require(tokensSold + tokenAmount <= totalTokensForSale, "Would exceed total supply");
        
        // Update state
        tokenRights[msg.sender] += tokenAmount;
        tokensSold += tokenAmount;
        
        emit TokensPurchased(msg.sender, tokenAmount, msg.value);
    }
    
    /**
     * @dev Allows owner to release a percentage of tokens for claiming
     * @param percentage Percentage of tokens to release (1-100)
     */
    function releaseTokens(uint256 percentage) external override onlyOwner {
        require(percentage > releasedPercentage, "Can only increase percentage");
        require(percentage <= 100, "Cannot release more than 100%");
        
        releasedPercentage = percentage;
        emit TokensReleased(percentage, block.timestamp);
    }
    
    /**
     * @dev Allows token buyers to claim their released tokens
     */
    function claimTokens() external override nonReentrant whenNotPaused {
        require(releasedPercentage > 0, "No tokens released yet");
        require(tokenRights[msg.sender] > 0, "No tokens to claim");
        
        // Calculate claimable amount
        uint256 totalClaimable = (tokenRights[msg.sender] * releasedPercentage) / 100;
        uint256 remainingToClaim = totalClaimable - claimedTokens[msg.sender];
        require(remainingToClaim > 0, "No new tokens to claim");
        
        // Update state before transfer
        claimedTokens[msg.sender] += remainingToClaim;
        
        // Transfer tokens
        require(_token.transfer(msg.sender, remainingToClaim), "Token transfer failed");
        emit TokensClaimed(msg.sender, remainingToClaim);
    }
    
    /**
     * @dev Returns the amount of tokens a buyer can currently claim
     * @param buyer Address of the token buyer
     * @return Amount of tokens that can be claimed
     */
    function getClaimableTokens(address buyer) external view override returns (uint256) {
        if (releasedPercentage == 0 || tokenRights[buyer] == 0) {
            return 0;
        }
        
        uint256 totalClaimable = (tokenRights[buyer] * releasedPercentage) / 100;
        return totalClaimable - claimedTokens[buyer];
    }
    
    /**
     * @dev Allows owner to pause token purchases and claims
     */
    function pause() external override onlyOwner {
        _pause();
    }
    
    /**
     * @dev Allows owner to unpause token purchases and claims
     */
    function unpause() external override onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Allows owner to withdraw accumulated ETH
     */
    function withdrawETH() external override onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "ETH transfer failed");
    }
    
    /**
     * @dev Allows owner to withdraw any accidentally sent tokens
     * @param tokenAddr Address of the token to withdraw
     */
    function withdrawToken(address tokenAddr) external override onlyOwner {
        require(tokenAddr != address(_token), "Cannot withdraw sale token");
        
        IERC20 tokenToWithdraw = IERC20(tokenAddr);
        uint256 balance = tokenToWithdraw.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        require(tokenToWithdraw.transfer(msg.sender, balance), "Token transfer failed");
    }
} 