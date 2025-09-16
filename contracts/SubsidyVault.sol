// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SubsidyVault
/// @notice Handles subsidy funds released for tenders
contract SubsidyVault {
    struct Subsidy {
        uint256 totalAmount;
        uint256 releasedAmount;
        address beneficiary;
        uint8 auditScore;
        bool kpiCompliant;
    }

    address public immutable tenderSystem;
    mapping(uint256 => Subsidy) public subsidies; // tenderId => Subsidy

    event SubsidyReleased(uint256 indexed tenderId, address indexed to, uint256 amount);

    modifier onlyTenderSystem() {
        require(msg.sender == tenderSystem, "not system");
        _;
    }

    constructor(address _tenderSystem) {
        require(_tenderSystem != address(0), "invalid system");
        tenderSystem = _tenderSystem;
    }

    /// @notice Deposit subsidy for a tender
    function fundSubsidy(uint256 tenderId, address beneficiary) external payable onlyTenderSystem {
        Subsidy storage s = subsidies[tenderId];
        s.totalAmount += msg.value;
        s.beneficiary = beneficiary;
    }

    /// @notice Set audit score for a tender subsidy
    function setAuditScore(uint256 tenderId, uint8 score) external onlyTenderSystem {
        subsidies[tenderId].auditScore = score;
    }

    /// @notice Record KPI compliance for a tender subsidy
    function setKpiCompliance(uint256 tenderId, bool compliant) external onlyTenderSystem {
        subsidies[tenderId].kpiCompliant = compliant;
    }

    /// @notice Release subsidy to the beneficiary
    function releaseSubsidy(uint256 tenderId, uint256 amount) external onlyTenderSystem {
        Subsidy storage s = subsidies[tenderId];
        require(s.totalAmount - s.releasedAmount >= amount, "insufficient");
        s.releasedAmount += amount;
        payable(s.beneficiary).transfer(amount);
        emit SubsidyReleased(tenderId, s.beneficiary, amount);
    }
}
