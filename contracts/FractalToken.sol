// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./FRTAuditTrail.sol";
import "./enums/OperationType.sol";

/// @title Fractal Token
/// @notice ERC-20 token with permit functionality, minting and pausable transfers.
/// Implements standards per Swiss FINMA guidelines.
contract FractalToken is ERC20, ERC20Permit, Ownable, Pausable {
    // Store the initial token supply for audit transparency
    uint256 private immutable _initialSupply;

    /// @notice Optional audit trail contract for compliant tracing
    FRTAuditTrail public auditTrail;

    // Temporary storage for purpose hash during audited operations
    bytes32 private _pendingPurposeHash;

    /// @notice Deploy the token and mint the full initial supply to the deployer.
    /// @param initialSupply Amount of tokens to mint on deployment (in wei).
    constructor(uint256 initialSupply)
        ERC20("Fractal Token", "FRT")
        ERC20Permit("Fractal Token")
    {
        _initialSupply = initialSupply;
        _mint(msg.sender, initialSupply);
    }

    /// @notice Set the external audit trail contract.
    function setAuditTrail(FRTAuditTrail trail) external onlyOwner {
        auditTrail = trail;
    }

    /// @notice Return the initial supply minted at deployment.
    function initialSupply() external view returns (uint256) {
        return _initialSupply;
    }

    /// @notice Mint new tokens to `to`. Only callable by the contract owner.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Mint with an audit purpose hash.
    function mintWithPurpose(address to, uint256 amount, bytes32 purposeHash) external onlyOwner {
        _pendingPurposeHash = purposeHash;
        _mint(to, amount);
    }

    /// @notice Burn `amount` of the caller's tokens.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Transfer with an audit purpose hash.
    function transferWithPurpose(address to, uint256 amount, bytes32 purposeHash) external returns (bool) {
        _pendingPurposeHash = purposeHash;
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Burn with an audit purpose hash.
    function burnWithPurpose(uint256 amount, bytes32 purposeHash) external {
        _pendingPurposeHash = purposeHash;
        _burn(msg.sender, amount);
    }

    /// @notice Pause all token transfers. Callable only by the owner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause token transfers. Callable only by the owner.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev Prevent token transfers while paused by using the ERC-20 hook.
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override
    {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "FractalToken: token transfer while paused");
    }

    /// @dev After transfer hook used to emit audit trail events.
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override
    {
        super._afterTokenTransfer(from, to, amount);
        if (address(auditTrail) != address(0)) {
            OperationType op = OperationType.TRANSFER;
            if (from == address(0)) {
                op = OperationType.MINT;
            } else if (to == address(0)) {
                op = OperationType.BURN;
            }
            auditTrail.emitAuditRecord(from, to, amount, op, _pendingPurposeHash);
        }
        _pendingPurposeHash = 0;
    }
}
