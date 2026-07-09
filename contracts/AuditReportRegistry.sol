// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./EvidenceAnchor.sol";

/// @title AuditReportRegistry
/// @notice Registra reportes firmados con hash, periodo, batch root y deprecaciones.
contract AuditReportRegistry is AccessControl {
    bytes32 public constant AUDITOR = keccak256("AUDITOR");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");

    struct Report {
        bytes32 rid;
        bytes32 reportHash;
        bytes32 periodHash;
        bytes32 batchId;
        address issuer;
        uint64 issuedAt;
        bool active;
        bytes32 replacedBy;
    }

    mapping(bytes32 => Report) private reports;
    EvidenceAnchor public evidenceAnchor;

    event ReportRegistered(bytes32 indexed rid, bytes32 reportHash, bytes32 periodHash, bytes32 batchId, address issuer);
    event ReportDeprecated(bytes32 indexed rid, bytes32 indexed replacedByRid);
    event EvidenceAnchorSet(address indexed anchor);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AUDITOR, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _setRoleAdmin(AUDITOR, COMPLIANCE_ADMIN);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
    }

    function setEvidenceAnchor(address anchor) external onlyRole(COMPLIANCE_ADMIN) {
        evidenceAnchor = EvidenceAnchor(anchor);
        // best-effort to allow this registry to anchor directly
        try evidenceAnchor.grantRole(evidenceAnchor.AUDITOR(), address(this)) {} catch {}
        emit EvidenceAnchorSet(anchor);
    }

    function registerReport(bytes32 rid, bytes32 reportHash, bytes32 periodHash, bytes32 batchId) external onlyRole(AUDITOR) {
        require(rid != bytes32(0), "rid required");
        require(reportHash != bytes32(0), "report hash required");
        require(periodHash != bytes32(0), "period hash required");
        require(reports[rid].issuedAt == 0, "rid exists");

        reports[rid] = Report({
            rid: rid,
            reportHash: reportHash,
            periodHash: periodHash,
            batchId: batchId,
            issuer: msg.sender,
            issuedAt: uint64(block.timestamp),
            active: true,
            replacedBy: bytes32(0)
        });
        emit ReportRegistered(rid, reportHash, periodHash, batchId, msg.sender);

        if (address(evidenceAnchor) != address(0)) {
            // best-effort to anchor the report hash
            try evidenceAnchor.anchorHash(reportHash, EvidenceAnchor.AnchorType.REPORT, rid) {} catch {}
        }
    }

    function deprecateReport(bytes32 rid, bytes32 replacedByRid) external {
        require(hasRole(AUDITOR, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender), "not authorized");
        Report storage r = reports[rid];
        require(r.issuedAt != 0, "report missing");
        require(r.active, "already inactive");
        r.active = false;
        r.replacedBy = replacedByRid;
        emit ReportDeprecated(rid, replacedByRid);
    }

    function getReport(bytes32 rid) external view returns (Report memory) {
        return reports[rid];
    }
}
