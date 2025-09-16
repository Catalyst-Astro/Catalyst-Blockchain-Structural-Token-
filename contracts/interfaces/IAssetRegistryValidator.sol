// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Asset Registry Validator Interface
/// @notice Minimal interface for validating assets stored in FractalLandRegistry.
interface IAssetRegistryValidator {
    /// @notice Return true if the asset exists and is active.
    function isAssetActive(uint256 assetId) external view returns (bool);

    /// @notice Return the owner of a given asset.
    function ownerOf(uint256 assetId) external view returns (address);

    /// @notice Document hash associated with the asset.
    function documentHashOf(uint256 assetId) external view returns (bytes32);
}
