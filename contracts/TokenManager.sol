// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Bridge.sol";
import "./Oracle.sol";

contract TokenManager is ERC20, Ownable {
    address public bridge;
    address public oracle;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        uint256 bridgeAmount,
        uint256 transferFee,
        uint256 operationFee
    ) ERC20(name_, symbol_) {
        transferOwnership(msg.sender);
        require(totalSupply_ >= bridgeAmount, "Bridge amount exceeds supply");

        // Deploy the Oracle contract, with msg.sender as owner
        Oracle deployedOracle = new Oracle(msg.sender);
        oracle = address(deployedOracle);

        // Deploy the Bridge contract, with Oracle as owner
        Bridge deployedBridge = new Bridge(
            address(this),      // token = this ERC20
            transferFee,
            operationFee,
            oracle,             // owner of bridge = oracle,
            msg.sender
        );
        bridge = address(deployedBridge);

        // Mint total supply to this contract
        _mint(address(this), totalSupply_);

        // Transfer bridge's portion
        _transfer(address(this), bridge, bridgeAmount);

        // Transfer rest to deployer (owner)
        uint256 ownerAmount = totalSupply_ - bridgeAmount;
        _transfer(address(this), msg.sender, ownerAmount);
    }

    modifier onlyBridge() {
        require(msg.sender == bridge, "Only bridge can call this");
        _;
    }

    function burnFrom(address account, uint256 amount) public onlyBridge {
        _burn(account, amount);
    }

    function mint(address to, uint256 amount) public onlyBridge {
        _mint(to, amount);
    }

}