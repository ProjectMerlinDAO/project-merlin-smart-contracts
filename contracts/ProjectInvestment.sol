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
    string public projectId;
    address public projectDAO;
    
    mapping(address => uint256) public investments;
    
    event InvestmentMade(address investor, uint256 amount, string projectId);
    event InvestmentWithdrawn(address investor, uint256 amount, string projectId);
    event OwnerWithdraw(uint256 amount, string projectId);
    
    constructor(
        address _mrlnToken,
        uint256 _targetAmount,
        string memory _projectId,
        address _projectDAO
    ) {
        transferOwnership(msg.sender);
        require(_mrlnToken != address(0), "Invalid token address");
        require(_targetAmount > 0, "Target amount must be greater than 0");
        require(bytes(_projectId).length > 0, "Invalid project ID");
        require(_projectDAO != address(0), "Invalid DAO address");
        
        mrlnToken = IERC20(_mrlnToken);
        targetAmount = _targetAmount;
        startTime = block.timestamp;
        projectId = _projectId;
        projectDAO = _projectDAO;
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
    
    modifier onlyProjectDAO() {
        require(msg.sender == projectDAO, "Only ProjectDAO can call");
        _;
    }
    
    // This function can only be called by the ProjectDAO contract
    function contributeToProject(address investor, uint256 amount) external nonReentrant onlyProjectDAO investmentOpen {
        require(investor != owner(), "Owner cannot invest");
        require(amount > 0, "Amount must be greater than 0");
        
        require(
            mrlnToken.transferFrom(investor, address(this), amount),
            "Token transfer failed"
        );
        
        investments[investor] += amount;
        totalInvested += amount;
        
        emit InvestmentMade(investor, amount, projectId);
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
        
        emit InvestmentWithdrawn(msg.sender, amount, projectId);
    }
    
    function ownerWithdraw() external nonReentrant onlyOwner investmentEnded {
        require(totalInvested >= targetAmount, "Target not reached");
        require(!isFinalized, "Already withdrawn");
        
        isFinalized = true;
        
        require(
            mrlnToken.transfer(owner(), totalInvested),
            "Token transfer failed"
        );
        
        emit OwnerWithdraw(totalInvested, projectId);
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
    
    function getProjectId() external view returns (string memory) {
        return projectId;
    }
}
