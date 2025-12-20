// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PrivateOfferingRegistry
/// @notice Registry for private offerings and allowed jurisdictions.
contract PrivateOfferingRegistry is AccessControl {
    bytes32 public constant OFFERING_ADMIN_ROLE = keccak256("OFFERING_ADMIN");

    struct Offering {
        bytes32 offeringId;
        bytes32 exemptionType;
        bytes32 ppmHash;
        bytes32 subscriptionHash;
        bool active;
        uint64 createdAt;
        uint64 updatedAt;
        uint64 closedAt;
    }

    mapping(bytes32 => Offering) private offerings;
    mapping(bytes32 => mapping(bytes32 => bool)) private allowedJurisdictions;

    event OfferingCreated(bytes32 indexed offeringId, bytes32 indexed exemptionType, bytes32 ppmHash);
    event OfferingUpdated(bytes32 indexed offeringId, bytes32 indexed exemptionType, bytes32 ppmHash);
    event OfferingClosed(bytes32 indexed offeringId, uint64 closedAt);
    event JurisdictionUpdated(bytes32 indexed offeringId, bytes32 indexed jurisdiction, bool allowed);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OFFERING_ADMIN_ROLE, admin);
        _setRoleAdmin(OFFERING_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function createOffering(
        bytes32 offeringId,
        bytes32 exemptionType,
        bytes32 ppmHash,
        bytes32 subscriptionHash
    ) external onlyRole(OFFERING_ADMIN_ROLE) {
        require(offeringId != bytes32(0), "offering id required");
        require(offerings[offeringId].createdAt == 0, "offering exists");
        require(ppmHash != bytes32(0), "ppm hash required");
        require(subscriptionHash != bytes32(0), "subscription hash required");

        uint64 nowTs = uint64(block.timestamp);
        offerings[offeringId] = Offering({
            offeringId: offeringId,
            exemptionType: exemptionType,
            ppmHash: ppmHash,
            subscriptionHash: subscriptionHash,
            active: true,
            createdAt: nowTs,
            updatedAt: nowTs,
            closedAt: 0
        });

        emit OfferingCreated(offeringId, exemptionType, ppmHash);
    }

    function updateOffering(
        bytes32 offeringId,
        bytes32 exemptionType,
        bytes32 ppmHash,
        bytes32 subscriptionHash
    ) external onlyRole(OFFERING_ADMIN_ROLE) {
        Offering storage offering = offerings[offeringId];
        require(offering.createdAt != 0, "offering missing");
        require(offering.active, "offering closed");
        require(ppmHash != bytes32(0), "ppm hash required");
        require(subscriptionHash != bytes32(0), "subscription hash required");

        offering.exemptionType = exemptionType;
        offering.ppmHash = ppmHash;
        offering.subscriptionHash = subscriptionHash;
        offering.updatedAt = uint64(block.timestamp);

        emit OfferingUpdated(offeringId, exemptionType, ppmHash);
    }

    function closeOffering(bytes32 offeringId) external onlyRole(OFFERING_ADMIN_ROLE) {
        Offering storage offering = offerings[offeringId];
        require(offering.createdAt != 0, "offering missing");
        require(offering.active, "already closed");
        offering.active = false;
        offering.closedAt = uint64(block.timestamp);
        offering.updatedAt = offering.closedAt;
        emit OfferingClosed(offeringId, offering.closedAt);
    }

    function setJurisdictionAllowed(bytes32 offeringId, bytes32 jurisdiction, bool allowed)
        external
        onlyRole(OFFERING_ADMIN_ROLE)
    {
        require(offerings[offeringId].createdAt != 0, "offering missing");
        require(jurisdiction != bytes32(0), "jurisdiction required");
        allowedJurisdictions[offeringId][jurisdiction] = allowed;
        emit JurisdictionUpdated(offeringId, jurisdiction, allowed);
    }

    function isJurisdictionAllowed(bytes32 offeringId, bytes32 jurisdiction) external view returns (bool) {
        return allowedJurisdictions[offeringId][jurisdiction];
    }

    function isActive(bytes32 offeringId) external view returns (bool) {
        return offerings[offeringId].active;
    }

    function getOffering(bytes32 offeringId) external view returns (Offering memory) {
        return offerings[offeringId];
    }
}
