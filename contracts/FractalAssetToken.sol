// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IAssetRegistryValidator.sol";

/// @title FractalAssetToken
/// @notice ERC20 token representing fractional ownership of a registered asset.
contract FractalAssetToken is ERC20, ERC20Burnable, Ownable {
    /// @notice ID of the asset recorded in the registry.
    uint256 public immutable assetId;

    /// @notice Document hash associated with the asset.
    bytes32 public immutable documentHash;

    /// @dev Reference to the asset registry for validation.
    IAssetRegistryValidator public immutable registry;

    event AssetTokenized(uint256 indexed assetId, address indexed to, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 assetId_,
        IAssetRegistryValidator registry_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        assetId = assetId_;
        registry = registry_;
        documentHash = registry_.documentHashOf(assetId_);
    }

    /// @notice Mint tokens to `to` if the asset is active and caller is the owner.
    function mintAssetToken(uint256 id, address to, uint256 amount) external onlyOwner {
        require(id == assetId, "invalid asset");
        require(registry.isAssetActive(assetId), "asset inactive");
        _mint(to, amount);
        emit AssetTokenized(assetId, to, amount);
    }

    /// @notice Burn tokens from an address. Callable only by the owner.
    function burnAssetToken(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    /// @notice Return asset metadata. Token ID is unused but kept for ERC-721 parity.
    function getAssetMetadata(uint256 /* tokenId */) external view returns (uint256, bytes32) {
        return (assetId, documentHash);
    }
}
