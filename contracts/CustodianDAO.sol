// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CustodianDAO
/// @notice Minimal DAO acting as a wisdom council with veto power.
contract CustodianDAO {
    mapping(address => bool) public custodians;
    mapping(uint256 => bool) public approvals;

    event CustodianIntervened(uint256 indexed proposalId, bool approved);

    constructor(address[] memory initialCustodians) {
        for (uint256 i = 0; i < initialCustodians.length; i++) {
            custodians[initialCustodians[i]] = true;
        }
    }

    /// @notice Assign or revoke custodian rights.
    function setCustodian(address custodian, bool status) external {
        require(custodians[msg.sender], "only custodian");
        custodians[custodian] = status;
    }

    /// @notice Cast a custodial vote on a proposal.
    function custodialVote(uint256 proposalId, bool approve) external {
        require(custodians[msg.sender], "not custodian");
        approvals[proposalId] = approve;
        emit CustodianIntervened(proposalId, approve);
    }
}
