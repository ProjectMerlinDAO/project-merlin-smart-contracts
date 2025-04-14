// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ProjectInvestment is ReentrancyGuard, Ownable {
    IERC20 public immutable mrlnToken;
    
    uint256 public constant INVESTMENT_DURATION = 30 days;
    uint256 public immutable targetAmount;
    uint256 public totalInvested;
    uint256 public startTime;
    bool public isFinalized;
    
    mapping(address => uint256) public investments;
    
    event InvestmentMade(address investor, uint256 amount);
    event InvestmentWithdrawn(address investor, uint256 amount);
    event OwnerWithdraw(uint256 amount);
    
    constructor(
        address _mrlnToken,
        uint256 _targetAmount
    ) {
        transferOwnership(msg.sender);
        require(_mrlnToken != address(0), "Invalid token address");
        require(_targetAmount > 0, "Target amount must be greater than 0");
        
        mrlnToken = IERC20(_mrlnToken);
        targetAmount = _targetAmount;
        startTime = block.timestamp;
    }
    
    modifier investmentOpen() {
        require(block.timestamp <= startTime + INVESTMENT_DURATION, "Investment period ended");
        require(!isFinalized, "Investment already finalized");
        _;
    }
    
    modifier investmentEnded() {
        require(block.timestamp > startTime + INVESTMENT_DURATION, "Investment period not ended");
        require(!isFinalized, "Investment already finalized");
        _;
    }
    
    function invest(uint256 amount) external nonReentrant investmentOpen {
        require(msg.sender != owner(), "Owner cannot invest");
        require(amount > 0, "Amount must be greater than 0");
        
        require(
            mrlnToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        investments[msg.sender] += amount;
        totalInvested += amount;
        
        emit InvestmentMade(msg.sender, amount);
    }
    
    function withdrawInvestment() external nonReentrant investmentEnded {
        require(totalInvested < targetAmount, "Target reached, cannot withdraw");
        
        uint256 amount = investments[msg.sender];
        require(amount > 0, "No investment to withdraw");
        
        investments[msg.sender] = 0;
        totalInvested -= amount;
        
        require(
            mrlnToken.transfer(msg.sender, amount),
            "Token transfer failed"
        );
        
        emit InvestmentWithdrawn(msg.sender, amount);
    }
    
    function ownerWithdraw() external nonReentrant onlyOwner investmentEnded {
        require(totalInvested >= targetAmount, "Target not reached");
        require(!isFinalized, "Already withdrawn");
        
        isFinalized = true;
        
        require(
            mrlnToken.transfer(owner(), totalInvested),
            "Token transfer failed"
        );
        
        emit OwnerWithdraw(totalInvested);
    }
    
    // View functions
    function getTimeRemaining() public view returns (uint256) {
        if (block.timestamp >= startTime + INVESTMENT_DURATION) {
            return 0;
        }
        return (startTime + INVESTMENT_DURATION) - block.timestamp;
    }
    
    function getInvestorAmount(address investor) external view returns (uint256) {
        return investments[investor];
    }
    
    function isTargetReached() public view returns (bool) {
        return totalInvested >= targetAmount;
    }
    
    function isInvestmentPeriodOpen() public view returns (bool) {
        return block.timestamp <= startTime + INVESTMENT_DURATION && !isFinalized;
    }
}
