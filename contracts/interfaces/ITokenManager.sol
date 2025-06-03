// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title ITokenManager
 * @dev Interface for the Project Merlin token manager contract
 */
interface ITokenManager {
    /**
     * @dev Emitted when bridge infrastructure is deployed
     */
    event BridgeDeployed(address indexed bridge, address indexed oracle);
    
    /**
     * @dev Emitted when tokens are burned
     */
    event TokensBurned(address indexed account, uint256 amount);
    
    /**
     * @dev Emitted when tokens are minted
     */
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @dev Returns the bridge contract address
     */
    function bridge() external view returns (address);
    
    /**
     * @dev Returns the oracle contract address
     */
    function oracle() external view returns (address);
    
    /**
     * @dev Returns the maximum allowed transfer fee in basis points
     */
    function MAX_TRANSFER_FEE() external pure returns (uint256);
    
    /**
     * @dev Returns the maximum allowed operation fee in tokens
     */
    function MAX_OPERATION_FEE() external pure returns (uint256);
    
    /**
     * @dev Burns tokens from a specified account
     * @param account The account to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) external;
    
    /**
     * @dev Mints new tokens to a specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external;
} 