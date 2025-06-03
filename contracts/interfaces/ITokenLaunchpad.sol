// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ITokenLaunchpad
 * @dev Interface for the Project Merlin token launchpad contract
 */
interface ITokenLaunchpad {
    /**
     * @dev Emitted when tokens are purchased
     */
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 ethPaid);
    
    /**
     * @dev Emitted when tokens are released for claiming
     */
    event TokensReleased(uint256 percentage, uint256 timestamp);
    
    /**
     * @dev Emitted when tokens are claimed
     */
    event TokensClaimed(address indexed buyer, uint256 amount);

    /**
     * @dev Returns the token contract address
     */
    function token() external view returns (address);
    
    /**
     * @dev Returns the price of 1 token in Wei
     */
    function tokenPriceInWei() external view returns (uint256);
    
    /**
     * @dev Returns the total number of tokens for sale
     */
    function totalTokensForSale() external view returns (uint256);
    
    /**
     * @dev Returns the number of tokens sold
     */
    function tokensSold() external view returns (uint256);
    
    /**
     * @dev Returns the percentage of tokens released for claiming
     */
    function releasedPercentage() external view returns (uint256);
    
    /**
     * @dev Returns the number of tokens a buyer has rights to
     * @param buyer Address of the buyer
     */
    function tokenRights(address buyer) external view returns (uint256);
    
    /**
     * @dev Returns the number of tokens a buyer has claimed
     * @param buyer Address of the buyer
     */
    function claimedTokens(address buyer) external view returns (uint256);
    
    /**
     * @dev Allows users to buy token rights with ETH
     */
    function buyTokens() external payable;
    
    /**
     * @dev Allows owner to release a percentage of tokens for claiming
     * @param percentage Percentage of tokens to release (1-100)
     */
    function releaseTokens(uint256 percentage) external;
    
    /**
     * @dev Allows token buyers to claim their released tokens
     */
    function claimTokens() external;
    
    /**
     * @dev Returns the amount of tokens a buyer can currently claim
     * @param buyer Address of the token buyer
     * @return Amount of tokens that can be claimed
     */
    function getClaimableTokens(address buyer) external view returns (uint256);
    
    /**
     * @dev Allows owner to pause token purchases and claims
     */
    function pause() external;
    
    /**
     * @dev Allows owner to unpause token purchases and claims
     */
    function unpause() external;
    
    /**
     * @dev Allows owner to withdraw accumulated ETH
     */
    function withdrawETH() external;
    
    /**
     * @dev Allows owner to withdraw any accidentally sent tokens
     * @param _token Address of the token to withdraw
     */
    function withdrawToken(address _token) external;
} 