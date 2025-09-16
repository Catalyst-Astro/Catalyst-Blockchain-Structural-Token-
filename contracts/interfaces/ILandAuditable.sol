// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../AssetStructs.sol";

/**
 * @title ILandAuditable
 * @notice Interfaz de consulta para auditores y comunidad.
 */
interface ILandAuditable {
    function getAsset(uint256 assetId) external view returns (AssetStructs.Asset memory);
    function getOwnerHistory(uint256 assetId) external view returns (address[] memory);
    function getTimeline(uint256 assetId) external view returns (AssetStructs.Modification[] memory);
}
