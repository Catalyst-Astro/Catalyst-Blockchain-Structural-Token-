// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PaymentRefRegistry
/// @notice Vincula hashes de referencias bancarias con EIDs sin almacenar PII.
contract PaymentRefRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant RAMP_OPERATOR = keccak256("RAMP_OPERATOR");

    mapping(bytes32 => bytes32) private eidOf;

    event PaymentRefRegistered(bytes32 indexed refHash, bytes32 indexed eid, address indexed actor);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(RAMP_OPERATOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(RAMP_OPERATOR, COMPLIANCE_ADMIN);
    }

    function registerRef(bytes32 refHash, bytes32 eid) external {
        require(hasRole(RAMP_OPERATOR, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender), "not authorized");
        require(refHash != bytes32(0), "ref hash required");
        require(eid != bytes32(0), "eid required");
        eidOf[refHash] = eid;
        emit PaymentRefRegistered(refHash, eid, msg.sender);
    }

    function getEid(bytes32 refHash) external view returns (bytes32) {
        return eidOf[refHash];
    }
}
