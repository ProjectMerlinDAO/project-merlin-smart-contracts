// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import {IBEP20} from "./interfaces/IBEP20.sol";
import {ITokenManager} from "./interfaces/ITokenManager.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TokenManager
 * @dev Implementation of the Project Merlin token with bridge functionality
 * 
 * This contract manages the ERC20/BEP20 token used in the Project Merlin ecosystem.
 * It includes bridging capabilities that can be added later through a dedicated Bridge contract.
 *
 * Security considerations:
 * - Only the owner can mint and burn tokens initially
 * - Bridge address can be set later to enable cross-chain functionality
 * - Initial token distribution is handled in constructor
 * - Uses OpenZeppelin's battle-tested ERC20 and Ownable implementations
 */
contract TokenManager is ERC20, Ownable2Step, ITokenManager, IBEP20 {
    // Contract addresses for core functionality
    address public override bridge;
    address public override oracle;

    // Maximum allowed fees (in basis points)
    uint256 public constant override MAX_TRANSFER_FEE = 1000; // 10%
    uint256 public constant override MAX_OPERATION_FEE = 1000 * 10 ** 18; // 1000 tokens

    /**
     * @dev Constructor initializes the token without bridge infrastructure
     * @param name_ The name of the token
     * @param symbol_ The symbol of the token
     * @param totalSupply_ The total supply of tokens to be minted
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_
    ) ERC20(name_, symbol_) {
        require(bytes(name_).length != 0, "Name cannot be empty");
        require(bytes(symbol_).length != 0, "Symbol cannot be empty");
        require(totalSupply_ != 0, "Total supply must be positive");

        transferOwnership(msg.sender);

        // Mint total supply to deployer (owner)
        _mint(msg.sender, totalSupply_);
    }

    /**
     * @dev Returns the owner of the token contract (BEP-20 compatibility)
     */
    function getOwner() external view override returns (address) {
        return owner();
    }

    /**
     * @dev Sets the bridge and oracle addresses
     * @param _bridge Address of the bridge contract
     * @param _oracle Address of the oracle contract
     *
     * Security: Only callable by owner
     */
    function setBridgeAndOracle(address _bridge, address _oracle) external onlyOwner {
        require(_bridge != address(0), "Bridge address cannot be zero");
        require(_oracle != address(0), "Oracle address cannot be zero");
        require(bridge == address(0), "Bridge already set");
        require(oracle == address(0), "Oracle already set");

        bridge = _bridge;
        oracle = _oracle;

        emit BridgeDeployed(_bridge, _oracle);
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
     * @dev Burns tokens from a specified account, only callable by bridge or owner
     * @param account The account to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) public override {
        require(msg.sender == bridge || msg.sender == owner(), "Only bridge or owner can call this");
        require(account != address(0), "Cannot burn from zero address");
        require(amount != 0, "Cannot burn zero tokens");

        if (msg.sender == owner()) {
            // Owner must have allowance
            uint256 currentAllowance = allowance(account, owner());
            require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
            _approve(account, owner(), currentAllowance - amount);
        }

        _burn(account, amount);
        emit TokensBurned(account, amount);
    }

    /**
     * @dev Mints new tokens to a specified address, only callable by bridge or owner
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public override {
        require(msg.sender == bridge || msg.sender == owner(), "Only bridge or owner can call this");
        require(to != address(0), "Cannot mint to zero address");
        require(amount != 0, "Cannot mint zero tokens");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}