// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ProjectInvestment
 * @dev Contract for managing MRLN token investments in Project Merlin projects
 *
 * This contract manages:
 * - Project investment collection
 * - Investment period timing
 * - Withdrawal conditions
 * - Target amount tracking
 * - Investment finalization
 *
 * Security considerations:
 * - Protected against reentrancy attacks
 * - Safe token transfer handling
 * - Investment period controls
 * - Access control for critical functions
 * - Protected state updates
 */
contract ProjectInvestment is ReentrancyGuard, Ownable {
    // Core state variables
    IERC20 public immutable mrlnToken;
    uint256 public constant INVESTMENT_DURATION = 30 days;
    uint256 public immutable targetAmount;
    uint256 public totalInvested;
    uint256 public startTime;
    bool public isFinalized;
    string public projectId;
    address public projectDAO;
    
    // Investment tracking
    mapping(address => uint256) public investments;
    
    // Events
    event InvestmentMade(address indexed investor, uint256 amount, string indexed projectId);
    event InvestmentWithdrawn(address indexed investor, uint256 amount, string indexed projectId);
    event OwnerWithdraw(uint256 amount, string indexed projectId);
    
    /**
     * @dev Constructor initializes the investment contract
     * @param _mrlnToken Address of the MRLN token contract
     * @param _targetAmount Target investment amount in MRLN tokens
     * @param _projectId Unique identifier for the project
     * @param _projectDAO Address of the ProjectDAO contract
     *
     * Security:
     * - Validates input parameters
     * - Sets immutable variables
     * - Initializes investment period
     */
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
    
    /**
     * @dev Modifier to ensure function is called during investment period
     */
    modifier investmentOpen() {
        require(block.timestamp <= startTime + INVESTMENT_DURATION, "Investment period ended");
        require(!isFinalized, "Investment already finalized");
        _;
    }
    
    /**
     * @dev Modifier to ensure function is called after investment period
     */
    modifier investmentEnded() {
        require(block.timestamp > startTime + INVESTMENT_DURATION, "Investment period not ended");
        require(!isFinalized, "Investment already finalized");
        _;
    }
    
    /**
     * @dev Modifier to restrict access to ProjectDAO contract
     */
    modifier onlyProjectDAO() {
        require(msg.sender == projectDAO, "Only ProjectDAO can call");
        _;
    }
    
    /**
     * @dev Allows ProjectDAO to contribute MRLN tokens on behalf of an investor
     * @param investor Address of the investor
     * @param amount Amount of MRLN tokens to invest
     *
     * Security:
     * - Protected against reentrancy
     * - Only callable by ProjectDAO
     * - Investment period validation
     * - Safe token transfer handling
     * - Protected state updates
     */
    function contributeToProject(address investor, uint256 amount) external nonReentrant onlyProjectDAO investmentOpen {
        require(investor != address(0), "Invalid investor address");
        require(investor != owner(), "Owner cannot invest");
        require(amount > 0, "Amount must be greater than 0");
        require(totalInvested + amount <= targetAmount, "Would exceed target amount");
        
        require(
            mrlnToken.transferFrom(investor, address(this), amount),
            "Token transfer failed"
        );
        
        investments[investor] += amount;
        totalInvested += amount;
        
        emit InvestmentMade(investor, amount, projectId);
    }
    
    /**
     * @dev Allows investors to withdraw their investment if target not reached
     *
     * Security:
     * - Protected against reentrancy
     * - Only after investment period
     * - Only if target not reached
     * - Safe token transfer handling
     * - Protected state updates
     */
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
    
    /**
     * @dev Allows project owner to withdraw total investment if target reached
     *
     * Security:
     * - Protected against reentrancy
     * - Only owner can call
     * - Only after investment period
     * - Only if target reached
     * - Safe token transfer handling
     * - One-time withdrawal
     */
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
    /**
     * @dev Returns remaining time in investment period
     * @return uint256 Seconds remaining in investment period
     */
    function getTimeRemaining() public view returns (uint256) {
        if (block.timestamp >= startTime + INVESTMENT_DURATION) {
            return 0;
        }
        return (startTime + INVESTMENT_DURATION) - block.timestamp;
    }
    
    /**
     * @dev Returns investment amount for a specific investor
     * @param investor Address of the investor
     * @return uint256 Amount invested by the investor
     */
    function getInvestorAmount(address investor) external view returns (uint256) {
        require(investor != address(0), "Invalid investor address");
        return investments[investor];
    }
    
    /**
     * @dev Checks if investment target has been reached
     * @return bool True if target reached, false otherwise
     */
    function isTargetReached() public view returns (bool) {
        return totalInvested >= targetAmount;
    }
    
    /**
     * @dev Checks if investment period is still open
     * @return bool True if open, false if closed
     */
    function isInvestmentPeriodOpen() public view returns (bool) {
        return block.timestamp <= startTime + INVESTMENT_DURATION && !isFinalized;
    }
    
    /**
     * @dev Returns the project ID
     * @return string Project identifier
     */
    function getProjectId() external view returns (string memory) {
        return projectId;
    }
}
