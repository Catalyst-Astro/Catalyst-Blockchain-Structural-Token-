// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TenderRegistry.sol";
import "./SubsidyVault.sol";
import "./interfaces/ITenderAuditable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title FractalTenderSystem
/// @notice Manage public or private tenders over registered assets
contract FractalTenderSystem is Ownable {
    enum TenderType { OBRA, SUBSIDIO, COINVERSION }
    enum TenderState { ABIERTA, EVALUACION, ADJUDICADA, REVOCADA }

    struct Proposal {
        address proposer;
        string metadata; // could be IPFS hash
        uint256 amount;
        bool evaluated;
        uint256 score;
    }

    struct Tender {
        uint256 id;
        address assetContract;
        uint256 assetId;
        TenderType tenderType;
        uint256 economicTarget;
        uint256 deadline;
        string criteria;
        address committee;
        address executor;
        bytes32 docsHash;
        TenderState state;
        address winner;
    }

    TenderRegistry public immutable registry;
    SubsidyVault public immutable vault;

    // tenderId => proposals
    mapping(uint256 => Proposal[]) public proposals;
    mapping(uint256 => Tender) public tenders;

    event TenderLaunched(uint256 indexed tenderId, address indexed assetContract, uint256 assetId);
    event ProposalSubmitted(uint256 indexed tenderId, address proposer);
    event WinnerAssigned(uint256 indexed tenderId, address winner);
    event SubsidyReleased(uint256 indexed tenderId, address to, uint256 amount);

    constructor(TenderRegistry _registry, SubsidyVault _vault) {
        registry = _registry;
        vault = _vault;
    }

    /// @notice Launch a new tender over an asset
    function launchTender(
        address assetContract,
        uint256 assetId,
        TenderType tenderType,
        uint256 economicTarget,
        uint256 deadline,
        string calldata criteria,
        address committee,
        address executor,
        bytes32 docsHash
    ) external onlyOwner returns (uint256) {
        require(assetContract != address(0), "invalid asset");
        require(deadline > block.timestamp, "bad deadline");
        IERC721(assetContract).ownerOf(assetId); // check existence

        uint256 id = registry.recordTender(msg.sender, assetContract, assetId);
        Tender storage t = tenders[id];
        t.id = id;
        t.assetContract = assetContract;
        t.assetId = assetId;
        t.tenderType = tenderType;
        t.economicTarget = economicTarget;
        t.deadline = deadline;
        t.criteria = criteria;
        t.committee = committee;
        t.executor = executor;
        t.docsHash = docsHash;
        t.state = TenderState.ABIERTA;

        emit TenderLaunched(id, assetContract, assetId);
        return id;
    }

    /// @notice Submit a proposal for a tender
    function submitProposal(uint256 tenderId, string calldata metadata, uint256 amount) external {
        Tender storage t = tenders[tenderId];
        require(t.state == TenderState.ABIERTA, "not open");
        require(block.timestamp < t.deadline, "expired");
        proposals[tenderId].push(Proposal({
            proposer: msg.sender,
            metadata: metadata,
            amount: amount,
            evaluated: false,
            score: 0
        }));
        emit ProposalSubmitted(tenderId, msg.sender);
    }

    /// @notice Evaluate a proposal of a tender
    function evaluateProposal(uint256 tenderId, uint256 proposalIndex, uint256 score) external {
        Tender storage t = tenders[tenderId];
        require(msg.sender == t.committee, "not committee");
        require(t.state == TenderState.ABIERTA || t.state == TenderState.EVALUACION, "bad state");
        Proposal storage p = proposals[tenderId][proposalIndex];
        p.evaluated = true;
        p.score = score;
        t.state = TenderState.EVALUACION;
        registry.updateState(tenderId, TenderRegistry.TenderState.EVALUACION);
    }

    /// @notice Assign a winning proposal
    function assignWinner(uint256 tenderId, uint256 proposalIndex) external {
        Tender storage t = tenders[tenderId];
        require(msg.sender == t.committee, "not committee");
        require(t.state == TenderState.EVALUACION, "not evaluating");
        Proposal storage p = proposals[tenderId][proposalIndex];
        require(p.evaluated, "not evaluated");
        t.winner = p.proposer;
        t.state = TenderState.ADJUDICADA;
        registry.updateState(tenderId, TenderRegistry.TenderState.ADJUDICADA);
        vault.fundSubsidy{value: p.amount}(tenderId, p.proposer);
        emit WinnerAssigned(tenderId, p.proposer);
    }

    /// @notice Release funds from the vault to the winner
    function releaseFunds(uint256 tenderId, uint256 amount) external {
        Tender storage t = tenders[tenderId];
        require(msg.sender == t.committee || msg.sender == owner(), "unauthorized");
        require(t.state == TenderState.ADJUDICADA, "not awarded");
        vault.releaseSubsidy(tenderId, amount);
        emit SubsidyReleased(tenderId, t.winner, amount);
    }

    /// @notice Revoke a tender due to failure or breach
    function revokeTender(uint256 tenderId) external onlyOwner {
        Tender storage t = tenders[tenderId];
        require(t.state != TenderState.REVOCADA, "already");
        t.state = TenderState.REVOCADA;
        registry.updateState(tenderId, TenderRegistry.TenderState.REVOCADA);
    }
}
