// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Bridge.sol";

contract Oracle is Ownable {
    address public bridge;
    mapping(bytes32 => bool) public processedTransactions;
    mapping(bytes32 => bool) public validatedTransactions;

    constructor(address initialOwner) {
        transferOwnership(initialOwner);
    }

    function setBridge(address _bridge) public onlyOwner {
        require(_bridge != address(0), "Invalid bridge");
        bridge = _bridge;
    }

    function updateTransferFee(uint256 fee) public onlyOwner {
        Bridge(bridge).updateTransferFee(fee);
    }

    function updateOperationFee(uint256 fee) public onlyOwner {
        Bridge(bridge).updateOperationFee(fee);
    }

    function pauseBridge() public onlyOwner {
        Bridge(bridge).pause();
    }

    function unpauseBridge() public onlyOwner {
        Bridge(bridge).unpause();
    }

    function withdrawFeesTo(address to) public onlyOwner {
        Bridge(bridge).withdrawFees(to);
    }

    function changeOffchainAddress(address newOffchain) public onlyOwner {
        Bridge(bridge).changeOffchain(newOffchain);
    }
}