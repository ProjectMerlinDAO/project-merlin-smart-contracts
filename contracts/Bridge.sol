// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "./TokenManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Bridge is Ownable, Pausable {
    address public tokenAddress;
    uint256 public transferFee;    // percentage (e.g., 100 = 1%)
    uint256 public operationFee;   // flat fee in tokens
    uint256 constant FEE_DENOMINATOR = 10000;
    address offchainProcessor;


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

    modifier onlyOffchain(){
        require(msg.sender == offchainProcessor,"Only Offchain Procesor allowed to call this method");
        _;
    }

    constructor(
        address _token,
        uint256 _transferFee,
        uint256 _operationFee,
        address oracle,
        address _offchainProcessor
    ) {
        transferOwnership(oracle);
        require(_token != address(0), "Invalid token");
        tokenAddress = _token;
        transferFee = _transferFee;
        operationFee = _operationFee;
        offchainProcessor = _offchainProcessor;
    }

    function receiveAsset(
        uint256 amount,
        string memory destinationChain,
        address destinationAddress
    ) public whenNotPaused {
        TokenManager token = TokenManager(tokenAddress);

        uint256 allowance = token.allowance(msg.sender, address(this));
        require(allowance >= amount, "Insufficient allowance");

        uint256 fee = (amount * transferFee) / FEE_DENOMINATOR + operationFee;
        require(fee < amount, "Fee exceeds amount");

        uint256 amountAfterFee = amount - fee;

        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Burn tokens after transfer
        token.burnFrom(address(this), amountAfterFee);

        emit BridgeStarted(msg.sender, amount, amountAfterFee, destinationChain, destinationAddress);
    }

    function mintAsset(
        address to,
        uint256 amount
    ) public onlyOffchain whenNotPaused {
        TokenManager token = TokenManager(tokenAddress);
        token.mint(to, amount);

        emit AssetMinted(to, amount);
    }

    // Oracle controls these:
    function updateTransferFee(uint256 newFee) public onlyOwner {
        require(newFee <= 1000, "Too high"); // e.g. max 10%
        transferFee = newFee;
    }

    function updateOperationFee(uint256 newFee) public onlyOwner {
        operationFee = newFee;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function withdrawFees(address to) public onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(to, balance), "Withdraw failed");
    }

    function changeOffchain(address newOffchainProcessor) external  onlyOwner {
        require(newOffchainProcessor != address(0), "Invalid offchain processor");
        offchainProcessor = newOffchainProcessor;
    }
}