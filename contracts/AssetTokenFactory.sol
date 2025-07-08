// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IAssetRegistryValidator.sol";
import "./FractalAssetToken.sol";

/// @title AssetTokenFactory
/// @notice Deploys new FractalAssetToken contracts for registered assets.
contract AssetTokenFactory is Ownable {
    IAssetRegistryValidator public immutable registry;

    event AssetTokenCreated(uint256 indexed assetId, address tokenAddress);

    constructor(IAssetRegistryValidator registry_) Ownable(msg.sender) {
        registry = registry_;
    }

    /// @notice Create a new asset token for an active asset.
    function createAssetToken(
        uint256 assetId,
        string calldata name,
        string calldata symbol
    ) external returns (address) {
        require(registry.ownerOf(assetId) == msg.sender, "not owner");
        require(registry.isAssetActive(assetId), "inactive");
        FractalAssetToken token = new FractalAssetToken(name, symbol, assetId, registry);
        token.transferOwnership(msg.sender);
        emit AssetTokenCreated(assetId, address(token));
        return address(token);
    }
}
