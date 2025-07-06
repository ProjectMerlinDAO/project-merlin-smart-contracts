// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "./TokenManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title Bridge
 * @dev Manages cross-chain token transfers for the Project Merlin ecosystem
 *
 * This contract handles the bridging of tokens between different chains.
 * It includes fee management, pausable operations, and integration with
 * an offchain processor for cross-chain communication.
 *
 * Security considerations:
 * - Only Oracle can control fees and pause operations
 * - Only offchain processor can mint tokens
 * - Fee calculations protected against overflow
 * - Uses OpenZeppelin's Ownable and Pausable for security
 */
contract Bridge is Ownable2Step, Pausable {
    // Core state variables
    address public tokenAddress;
    uint256 public transferFee;    // percentage (e.g., 100 = 1%)
    uint256 public operationFee;   // flat fee in tokens
    uint256 private constant FEE_DENOMINATOR = 10000;
    address public offchainProcessor;

    // Maximum fee constraints
    uint256 private constant MAX_TRANSFER_FEE = 1000; // 10%
    uint256 private constant MAX_OPERATION_FEE = 1000 * 10**18; // 1000 tokens

    // Events for tracking bridge operations
    event BridgeStarted(
        address indexed user,
        uint256 amount,
        uint256 amountAfterFee,
        string destinationChain,
        address destinationAddress
    );

    event AssetMinted(
        address indexed recipient,
        uint256 amount
    );

    event FeeUpdated(
        uint256 newTransferFee,
        uint256 newOperationFee
    );

    event OffchainProcessorChanged(
        address indexed oldProcessor,
        address indexed newProcessor
    );

    event FeesWithdrawn(
        address indexed to,
        uint256 amount
    );

    /**
     * @dev Modifier to restrict functions to offchain processor
     */
    modifier onlyOffchain() {
        require(msg.sender == offchainProcessor, "Only Offchain Processor allowed to call this method");
        require(offchainProcessor != address(0), "Offchain processor not initialized");
        _;
    }

    /**
     * @dev Constructor initializes the bridge with token and fee settings
     * @param _token Address of the token contract
     * @param _transferFee Percentage fee for transfers (basis points)
     * @param _operationFee Flat fee for operations
     * @param oracle Address of the oracle that will own the bridge
     * @param _offchainProcessor Address of the offchain processor
     */
    constructor(
        address _token,
        uint256 _transferFee,
        uint256 _operationFee,
        address oracle,
        address _offchainProcessor
    ) payable {
        require(_token != address(0), "Invalid token address");
        require(oracle != address(0), "Invalid oracle address");
        require(_offchainProcessor != address(0), "Invalid processor address");
        require(_transferFee <= MAX_TRANSFER_FEE, "Transfer fee too high");
        require(_operationFee <= MAX_OPERATION_FEE, "Operation fee too high");

        tokenAddress = _token;
        transferFee = _transferFee;
        operationFee = _operationFee;
        offchainProcessor = _offchainProcessor;
        transferOwnership(oracle);
    }

    /**
     * @dev Initiates a bridge transfer to another chain
     * @param amount Amount of tokens to bridge
     * @param destinationChain Target chain identifier
     * @param destinationAddress Recipient address on target chain
     *
     * Security:
     * - Validates allowance and balances
     * - Calculates fees with overflow protection
     * - Burns tokens after successful transfer
     * - Admin (owner) is exempt from fees
     */
    function receiveAsset(
        uint256 amount,
        string memory destinationChain,
        address destinationAddress
    ) external whenNotPaused {
        require(amount != 0, "Amount must be greater than 0");
        require(bytes(destinationChain).length != 0, "Invalid destination chain");
        require(destinationAddress != address(0), "Invalid destination address");

        TokenManager token = TokenManager(tokenAddress);
        address thisAddress = address(this);
        
        uint256 allowance = token.allowance(msg.sender, thisAddress);
        require(allowance >= amount, "Insufficient allowance");

        // Calculate fees - exempt for admin
        uint256 totalFee = 0;
        uint256 amountAfterFee = amount;

        if (msg.sender != owner()) {
            // Calculate fees with overflow protection
            uint256 transferFeeAmount = (amount * transferFee) / FEE_DENOMINATOR;
            totalFee = transferFeeAmount + operationFee;
            require(totalFee < amount, "Fee exceeds amount");
            amountAfterFee = amount - totalFee;
        }

        require(token.transferFrom(msg.sender, thisAddress, amount), "Transfer failed");

        // Burn only the amount after fees, keep fees in contract
        if (amountAfterFee > 0) {
            token.burnFrom(thisAddress, amountAfterFee);
        }

        emit BridgeStarted(msg.sender, amount, amountAfterFee, destinationChain, destinationAddress);
    }

    /**
     * @dev Mints tokens for cross-chain transfers
     * @param to Recipient address
     * @param amount Amount of tokens to mint
     *
     * Security:
     * - Only callable by offchain processor
     * - Protected by pausable mechanism
     */
    function mintAsset(
        address to,
        uint256 amount
    ) external onlyOffchain whenNotPaused {
        require(to != address(0), "Invalid recipient");
        require(amount != 0, "Amount must be greater than 0");

        TokenManager token = TokenManager(tokenAddress);
        token.mint(to, amount);

        emit AssetMinted(to, amount);
    }

    /**
     * @dev Updates the transfer fee percentage
     * @param newFee New fee in basis points
     *
     * Security: Only callable by owner (Oracle)
     */
    function updateTransferFee(uint256 newFee) external payable onlyOwner {
        require(newFee <= MAX_TRANSFER_FEE, "Fee too high");
        transferFee = newFee;
        emit FeeUpdated(newFee, operationFee);
    }

    /**
     * @dev Updates the flat operation fee
     * @param newFee New fee amount
     *
     * Security: Only callable by owner (Oracle)
     */
    function updateOperationFee(uint256 newFee) external payable onlyOwner {
        require(newFee <= MAX_OPERATION_FEE, "Fee too high");
        operationFee = newFee;
        emit FeeUpdated(transferFee, newFee);
    }

    /**
     * @dev Pauses bridge operations
     * Security: Only callable by owner (Oracle)
     */
    function pause() external payable onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses bridge operations
     * Security: Only callable by owner (Oracle)
     */
    function unpause() external payable onlyOwner {
        _unpause();
    }

    /**
     * @dev Withdraws accumulated fees
     * @param to Address to receive the fees
     *
     * Security:
     * - Only callable by owner (Oracle)
     * - Protected against reentrancy by transfer pattern
     * - Emits event for tracking
     */
    function withdrawFees(address to) external payable onlyOwner {
        require(to != address(0), "Invalid recipient");
        IERC20 token = IERC20(tokenAddress);
        address thisAddress = address(this);
        uint256 balance = token.balanceOf(thisAddress);
        require(balance != 0, "No fees to withdraw");
        require(token.transfer(to, balance), "Fee withdrawal failed");
        emit FeesWithdrawn(to, balance);
    }

    /**
     * @dev Updates the offchain processor address
     * @param newOffchainProcessor New processor address
     *
     * Security: Only callable by owner (Oracle)
     */
    function changeOffchain(address newOffchainProcessor) external payable onlyOwner {
        require(newOffchainProcessor != address(0), "Invalid processor address");
        address oldProcessor = offchainProcessor;
        offchainProcessor = newOffchainProcessor;
        emit OffchainProcessorChanged(oldProcessor, newOffchainProcessor);
    }
}