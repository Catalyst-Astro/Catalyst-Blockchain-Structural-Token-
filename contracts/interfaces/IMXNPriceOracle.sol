// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// @title IMXNPriceOracle
/// @notice Interface for the MXN/CAT price oracle.
///         Provides on-chain conversion between Mexican Pesos (MXN) and CAT tokens.
interface IMXNPriceOracle {
    /// @notice Returns how many MXN 1 CAT is worth (1e18 precision)
    /// @dev catMxnRate = catUsdRate * usdMxnRate / 1e18
    function getCatMxnRate() external view returns (uint256);

    /// @notice Returns how many CAT are needed to pay a given MXN amount
    /// @param mxnAmount Amount in MXN (1e18 precision, e.g. 20000e18 = $20,000 MXN)
    /// @return catAmount Amount in CAT (1e18 precision)
    function getCatAmountForMxn(uint256 mxnAmount) external view returns (uint256 catAmount);

    /// @notice Returns the MXN value of a given CAT amount
    /// @param catAmount Amount in CAT (1e18 precision)
    /// @return mxnAmount Value in MXN (1e18 precision)
    function getMxnAmountForCat(uint256 catAmount) external view returns (uint256 mxnAmount);

    /// @notice Returns the CAT/USD rate (1 CAT = X USD, 1e18 precision)
    function getCatUsdRate() external view returns (uint256);

    /// @notice Returns the USD/MXN rate (1 USD = X MXN, 1e18 precision)
    function getUsdMxnRate() external view returns (uint256);

    /// @notice Whether the oracle data is fresh (not stale)
    function isStale() external view returns (bool);
}
