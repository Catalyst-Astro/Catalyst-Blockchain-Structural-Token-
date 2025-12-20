// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title InvestorEligibilityRegistry
/// @notice Stores eligibility status, investor type, and jurisdiction without PII.
contract InvestorEligibilityRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    struct InvestorProfile {
        bool eligible;
        bytes32 investorType;
        bytes32 jurisdiction;
        uint64 updatedAt;
    }

    mapping(address => InvestorProfile) private profiles;

    event InvestorApproved(address indexed investor, bytes32 indexed investorType, bytes32 indexed jurisdiction);
    event InvestorRevoked(address indexed investor);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ROLE, admin);
        _setRoleAdmin(COMPLIANCE_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function approveInvestor(address investor, bytes32 investorType, bytes32 jurisdiction)
        external
        onlyRole(COMPLIANCE_ROLE)
    {
        require(investor != address(0), "investor required");
        require(investorType != bytes32(0), "type required");
        require(jurisdiction != bytes32(0), "jurisdiction required");

        profiles[investor] = InvestorProfile({
            eligible: true,
            investorType: investorType,
            jurisdiction: jurisdiction,
            updatedAt: uint64(block.timestamp)
        });

        emit InvestorApproved(investor, investorType, jurisdiction);
    }

    function revokeInvestor(address investor) external onlyRole(COMPLIANCE_ROLE) {
        require(investor != address(0), "investor required");
        profiles[investor].eligible = false;
        profiles[investor].updatedAt = uint64(block.timestamp);
        emit InvestorRevoked(investor);
    }

    function isEligible(address investor) external view returns (bool) {
        return profiles[investor].eligible;
    }

    function jurisdictionOf(address investor) external view returns (bytes32) {
        return profiles[investor].jurisdiction;
    }

    function investorTypeOf(address investor) external view returns (bytes32) {
        return profiles[investor].investorType;
    }

    function getProfile(address investor) external view returns (InvestorProfile memory) {
        return profiles[investor];
    }
}
