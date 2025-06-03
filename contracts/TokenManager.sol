// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Bridge.sol";
import "./Oracle.sol";
import "./interfaces/ITokenManager.sol";

/**
 * @title TokenManager
 * @dev Implementation of the Project Merlin token with bridge functionality
 * 
 * This contract manages the ERC20 token used in the Project Merlin ecosystem.
 * It includes bridging capabilities through a dedicated Bridge contract and
 * oracle integration for cross-chain operations.
 *
 * Security considerations:
 * - Only the Bridge contract can mint and burn tokens
 * - Oracle ownership is critical for bridge security
 * - Initial token distribution is handled in constructor
 * - Uses OpenZeppelin's battle-tested ERC20 and Ownable implementations
 */
contract TokenManager is ERC20, Ownable, ITokenManager {
    // Contract addresses for core functionality
    address public override bridge;
    address public override oracle;

    // Maximum allowed fees (in basis points)
    uint256 public constant override MAX_TRANSFER_FEE = 1000; // 10%
    uint256 public constant override MAX_OPERATION_FEE = 1000 * 10**18; // 1000 tokens

    /**
     * @dev Constructor initializes the token and sets up the bridge infrastructure
     * @param name_ The name of the token
     * @param symbol_ The symbol of the token
     * @param totalSupply_ The total supply of tokens to be minted
     * @param bridgeAmount Amount of tokens to be allocated to the bridge
     * @param transferFee Fee percentage for bridge transfers (in basis points)
     * @param operationFee Flat fee for bridge operations
     *
     * Security note: Ensures bridgeAmount doesn't exceed totalSupply
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        uint256 bridgeAmount,
        uint256 transferFee,
        uint256 operationFee
    ) ERC20(name_, symbol_) {
        require(bytes(name_).length > 0, "Name cannot be empty");
        require(bytes(symbol_).length > 0, "Symbol cannot be empty");
        require(totalSupply_ > 0, "Total supply must be positive");
        require(transferFee <= MAX_TRANSFER_FEE, "Transfer fee too high");
        require(operationFee <= MAX_OPERATION_FEE, "Operation fee too high");
        require(totalSupply_ >= bridgeAmount, "Bridge amount exceeds supply");

        transferOwnership(msg.sender);

        // Deploy the Oracle contract, with msg.sender as owner
        Oracle deployedOracle = new Oracle(msg.sender);
        oracle = address(deployedOracle);
        require(oracle != address(0), "Oracle deployment failed");

        // Deploy the Bridge contract, with Oracle as owner
        Bridge deployedBridge = new Bridge(
            address(this),      // token = this ERC20
            transferFee,
            operationFee,
            oracle,             // owner of bridge = oracle
            msg.sender
        );
        bridge = address(deployedBridge);
        require(bridge != address(0), "Bridge deployment failed");

        emit BridgeDeployed(bridge, oracle);

        // Initial token distribution
        // 1. Mint total supply to this contract
        _mint(address(this), totalSupply_);

        // 2. Transfer bridge's portion
        _transfer(address(this), bridge, bridgeAmount);

        // 3. Transfer remaining tokens to deployer (owner)
        uint256 ownerAmount = totalSupply_ - bridgeAmount;
        _transfer(address(this), msg.sender, ownerAmount);
    }

    /**
     * @dev Modifier to restrict certain functions to only be called by the bridge contract
     * 
     * Security: Critical for maintaining token supply control
     */
    modifier onlyBridge() {
        require(msg.sender == bridge, "Only bridge can call this");
        require(bridge != address(0), "Bridge not initialized");
        _;
    }

    /**
     * @dev Burns tokens from a specified account, only callable by bridge
     * @param account The account to burn tokens from
     * @param amount The amount of tokens to burn
     *
     * Security: Protected by onlyBridge modifier
     */
    function burnFrom(address account, uint256 amount) public override onlyBridge {
        require(account != address(0), "Cannot burn from zero address");
        require(amount > 0, "Cannot burn zero tokens");
        _burn(account, amount);
        emit TokensBurned(account, amount);
    }

    /**
     * @dev Mints new tokens to a specified address, only callable by bridge
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     *
     * Security: Protected by onlyBridge modifier
     */
    function mint(address to, uint256 amount) public override onlyBridge {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Cannot mint zero tokens");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}