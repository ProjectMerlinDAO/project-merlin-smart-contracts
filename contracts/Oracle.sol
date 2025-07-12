// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import {Bridge} from "./Bridge.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title Oracle
 * @dev Controls and manages the bridge operations in the Project Merlin ecosystem
 *
 * This contract serves as the central authority for bridge operations,
 * managing fees, pausing mechanisms, and offchain processor updates.
 * It acts as the owner of the Bridge contract and provides a secure
 * interface for bridge management.
 *
 * Security considerations:
 * - Only owner can control bridge operations
 * - Protected bridge address setting
 * - Validated fee updates
 * - Uses OpenZeppelin's Ownable for access control
 */
contract Oracle is Ownable2Step {
    // Core state variables
    address public bridge;

    // Validation mappings
    mapping(bytes32 => bool) public processedTransactions;
    mapping(bytes32 => bool) public validatedTransactions;

    // Events
    event BridgeSet(address indexed bridge);
    event TransactionProcessed(bytes32 indexed txHash);
    event TransactionValidated(bytes32 indexed txHash);
    event FeeUpdated(uint256 transferFee, uint256 operationFee);
    event BridgeStateChanged(bool isPaused);

    /**
     * @dev Constructor sets up the Oracle with initial owner
     * @param initialOwner Address that will control the Oracle
     */
    constructor(address initialOwner)  {
        require(initialOwner != address(0), "Invalid owner address");
        transferOwnership(initialOwner);
    }

    /**
     * @dev Sets the bridge contract address
     * @param _bridge Address of the bridge contract
     *
     * Security:
     * - Only callable by owner
     * - Validates bridge address
     * - Emits event for tracking
     */
    function setBridge(address _bridge) external onlyOwner {
        require(_bridge != address(0), "Invalid bridge address");
        require(bridge == address(0), "Bridge already set"); // Can only be set once
        bridge = _bridge;
        emit BridgeSet(_bridge);
    }

    /**
     * @dev Updates the transfer fee on the bridge
     * @param fee New transfer fee in basis points
     *
     * Security:
     * - Only callable by owner
     * - Validates bridge initialization
     * - Emits event for tracking
     */
    function updateTransferFee(uint256 fee) external onlyOwner {
        require(bridge != address(0), "Bridge not initialized");
        Bridge(bridge).updateTransferFee(fee);
        emit FeeUpdated(fee, Bridge(bridge).operationFee());
    }

    /**
     * @dev Updates the operation fee on the bridge
     * @param fee New operation fee amount
     *
     * Security:
     * - Only callable by owner
     * - Validates bridge initialization
     * - Emits event for tracking
     */
    function updateOperationFee(uint256 fee) external onlyOwner {
        require(bridge != address(0), "Bridge not initialized");
        Bridge(bridge).updateOperationFee(fee);
        emit FeeUpdated(Bridge(bridge).transferFee(), fee);
    }

    /**
     * @dev Pauses bridge operations
     *
     * Security:
     * - Only callable by owner
     * - Validates bridge initialization
     * - Emits event for tracking
     */
    function pauseBridge() external onlyOwner {
        require(bridge != address(0), "Bridge not initialized");
        Bridge(bridge).pause();
        emit BridgeStateChanged(true);
    }

    /**
     * @dev Unpauses bridge operations
     *
     * Security:
     * - Only callable by owner
     * - Validates bridge initialization
     * - Emits event for tracking
     */
    function unpauseBridge() external onlyOwner {
        require(bridge != address(0), "Bridge not initialized");
        Bridge(bridge).unpause();
        emit BridgeStateChanged(false);
    }

    /**
     * @dev Withdraws accumulated fees from the bridge
     * @param to Address to receive the fees
     *
     * Security:
     * - Only callable by owner
     * - Validates bridge initialization and recipient
     */
    function withdrawFeesTo(address to) external onlyOwner {
        require(bridge != address(0), "Bridge not initialized");
        require(to != address(0), "Invalid recipient address");
        Bridge(bridge).withdrawFees(to);
    }

    /**
     * @dev Updates the offchain processor address
     * @param newOffchain New offchain processor address
     *
     * Security:
     * - Only callable by owner
     * - Validates bridge initialization and new address
     */
    function changeOffchainAddress(address newOffchain) external onlyOwner {
        require(bridge != address(0), "Bridge not initialized");
        require(newOffchain != address(0), "Invalid offchain address");
        Bridge(bridge).changeOffchain(newOffchain);
    }

    /**
     * @dev Marks a transaction as processed
     * @param txHash Hash of the processed transaction
     *
     * Security:
     * - Only callable by owner
     * - Prevents double processing
     * - Emits event for tracking
     */
    function markTransactionProcessed(bytes32 txHash) external onlyOwner {
        require(!processedTransactions[txHash], "Transaction already processed");
        processedTransactions[txHash] = true;
        emit TransactionProcessed(txHash);
    }

    /**
     * @dev Marks a transaction as validated
     * @param txHash Hash of the validated transaction
     *
     * Security:
     * - Only callable by owner
     * - Prevents double validation
     * - Emits event for tracking
     */
    function markTransactionValidated(bytes32 txHash) external onlyOwner {
        require(!validatedTransactions[txHash], "Transaction already validated");
        validatedTransactions[txHash] = true;
        emit TransactionValidated(txHash);
    }
}