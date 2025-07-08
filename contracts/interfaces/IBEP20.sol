// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IBEP20
 * @dev Interface for BEP-20 token standard, extending ERC-20
 */
interface IBEP20 is IERC20 {
    /**
     * @dev Returns the owner of the token contract
     */
    function getOwner() external view returns (address);
} 