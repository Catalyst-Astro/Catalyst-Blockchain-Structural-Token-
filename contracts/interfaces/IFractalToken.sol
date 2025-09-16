// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../enums/OperationType.sol";

interface IFractalToken {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function transferWithPurpose(address to, uint256 amount, bytes32 purposeHash) external returns (bool);
    function mintWithPurpose(address to, uint256 amount, bytes32 purposeHash) external;
    function burnWithPurpose(uint256 amount, bytes32 purposeHash) external;
    function auditTrail() external view returns (address);
}
