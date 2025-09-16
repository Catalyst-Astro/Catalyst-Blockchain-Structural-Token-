// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./enums/OperationType.sol";

/// @title FRTAuditTrail
/// @notice Records audited token operations for the Fractal Token.
contract FRTAuditTrail {
    /// @notice Address of the FractalToken contract allowed to emit records.
    address public immutable fractalToken;

    /// @notice Emitted on every token operation for audit purposes.
    /// @param from Address tokens moved from or zero for mint.
    /// @param to Address tokens moved to or zero for burn.
    /// @param amount Number of tokens involved in the operation.
    /// @param operationType Type of operation executed.
    /// @param purposeHash Off-chain hash describing reason and metadata.
    /// @param timestamp Block timestamp when the event was emitted.
    event AuditTrail(
        address indexed from,
        address indexed to,
        uint256 amount,
        OperationType operationType,
        bytes32 indexed purposeHash,
        uint256 timestamp
    );

    modifier onlyToken() {
        require(msg.sender == fractalToken, "Audit: only token");
        _;
    }

    /// @param token Address of the FractalToken contract.
    constructor(address token) {
        require(token != address(0), "token zero");
        fractalToken = token;
    }

    /// @notice Emit an audit event. Can only be called by the token contract.
    function emitAuditRecord(
        address from,
        address to,
        uint256 amount,
        OperationType operationType,
        bytes32 purposeHash
    ) external onlyToken {
        emit AuditTrail(from, to, amount, operationType, purposeHash, block.timestamp);
    }
}
