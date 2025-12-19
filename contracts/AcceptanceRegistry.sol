// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DisclosureRegistry.sol";

/// @title AcceptanceRegistry
/// @notice Records wallet acceptance of the active disclosure version.
contract AcceptanceRegistry {
    DisclosureRegistry public immutable disclosureRegistry;

    mapping(address => uint256) public acceptedVersion;
    mapping(address => uint64) public acceptedAt;

    event DisclosureAccepted(address indexed wallet, uint256 indexed versionId, uint64 timestamp);

    constructor(DisclosureRegistry registry) {
        require(address(registry) != address(0), "registry required");
        disclosureRegistry = registry;
    }

    /// @notice Accept the currently active disclosure version.
    function acceptActiveDisclosure() external {
        uint256 activeVersion = disclosureRegistry.activeVersion();
        require(activeVersion != 0, "no active version");
        acceptedVersion[msg.sender] = activeVersion;
        acceptedAt[msg.sender] = uint64(block.timestamp);
        emit DisclosureAccepted(msg.sender, activeVersion, uint64(block.timestamp));
    }

    /// @notice Check if a wallet accepted a specific disclosure version.
    function hasAccepted(address wallet, uint256 versionId) external view returns (bool) {
        return versionId != 0 && acceptedVersion[wallet] == versionId;
    }
}
