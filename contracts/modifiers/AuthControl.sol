// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuthControl
 * @dev Provides a modifier to restrict function calls to authorized contracts.
 */
contract AuthControl is Ownable {
    mapping(address => bool) private _authorized;

    event Authorized(address indexed account);
    event Revoked(address indexed account);

    modifier onlyAuthorized() {
        require(_authorized[msg.sender], "not authorized");
        _;
    }

    function authorize(address account) external onlyOwner {
        _authorized[account] = true;
        emit Authorized(account);
    }

    function revoke(address account) external onlyOwner {
        _authorized[account] = false;
        emit Revoked(account);
    }

    function isAuthorized(address account) external view returns (bool) {
        return _authorized[account];
    }
}
