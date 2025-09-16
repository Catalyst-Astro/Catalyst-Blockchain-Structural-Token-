pragma solidity ^0.8.20;

/// @title PurposeTag
/// @notice Extension that emits a narrative purpose for DAO-coordinated transfers.
abstract contract PurposeTag {
    /// @dev Emitted when a user tags a purpose for a transfer or interaction.
    event PurposeTagged(address indexed from, string purpose);

    /// @notice Internal helper to log a purpose tag from `from`.
    function _tagPurpose(address from, string memory purpose) internal virtual {
        emit PurposeTagged(from, purpose);
    }
}
