// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TenderRegistry
/// @notice Simple registry to track tender states and ownership
contract TenderRegistry {
    enum TenderState { ABIERTA, EVALUACION, ADJUDICADA, REVOCADA }

    struct TenderInfo {
        address creator;
        address assetContract;
        uint256 assetId;
        TenderState state;
    }

    uint256 public nextTenderId;
    mapping(uint256 => TenderInfo) public tenders;

    event TenderRecorded(uint256 indexed tenderId, address indexed creator);
    event StateUpdated(uint256 indexed tenderId, TenderState state);

    function recordTender(address creator, address assetContract, uint256 assetId) external returns (uint256) {
        uint256 id = nextTenderId++;
        tenders[id] = TenderInfo({
            creator: creator,
            assetContract: assetContract,
            assetId: assetId,
            state: TenderState.ABIERTA
        });
        emit TenderRecorded(id, creator);
        return id;
    }

    function updateState(uint256 tenderId, TenderState state) external {
        tenders[tenderId].state = state;
        emit StateUpdated(tenderId, state);
    }
}
