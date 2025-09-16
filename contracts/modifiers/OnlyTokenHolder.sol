// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../interfaces/IFractalToken.sol";

/// @notice Modifier to restrict functions to FRT holders above a threshold.
abstract contract OnlyTokenHolder {
    IFractalToken public immutable token;
    uint256 public immutable minHoldingThreshold;

    constructor(IFractalToken _token, uint256 _threshold) {
        token = _token;
        minHoldingThreshold = _threshold;
    }

    modifier onlyTokenHolder() {
        require(token.balanceOf(msg.sender) >= minHoldingThreshold, "not enough tokens");
        _;
    }
}
