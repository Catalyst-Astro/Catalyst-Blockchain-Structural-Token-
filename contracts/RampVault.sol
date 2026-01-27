// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./ComplianceGate.sol";
import "./EventRegistry.sol";

/// @title RampVault
/// @notice Escrow/bóveda de rampa que condiciona cash-in/out a KYC/AML + evento verificado.
contract RampVault is AccessControl {
    enum Direction {
        NONE,
        CASH_IN,
        CASH_OUT
    }

    enum Status {
        NONE,
        REQUESTED,
        CONFIRMED,
        SETTLED,
        CANCELED
    }

    struct Operation {
        address wallet;
        uint256 amount;
        Direction direction;
        Status status;
        bytes32 paymentRefHash;
        bytes32 confirmationVID;
        address confirmedBy;
        uint64 requestedAt;
        uint64 settledAt;
    }

    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant RAMP_OPERATOR = keccak256("RAMP_OPERATOR");

    IERC20 public immutable settlementToken;
    ComplianceGate public complianceGate;
    EventRegistry public eventRegistry;

    uint256 public maxPerTx;
    uint256 public dailyLimitPerWallet;
    uint256 public cooldownSeconds;
    uint32 public requireAttestationCount;

    mapping(bytes32 => Operation) private operations;
    mapping(address => uint256) private dailyAmount;
    mapping(address => uint64) private dailyStart;
    mapping(address => uint64) private lastOpAt;

    event CashInRequested(bytes32 indexed eid, address indexed wallet, uint256 amount, bytes32 paymentRefHash);
    event CashInConfirmed(bytes32 indexed eid, bytes32 confirmationVID, address indexed operator);
    event CashOutRequested(bytes32 indexed eid, address indexed wallet, uint256 amount, bytes32 payoutRefHash);
    event CashOutConfirmed(bytes32 indexed eid, bytes32 confirmationVID, address indexed operator);
    event Settled(bytes32 indexed eid, uint256 amount, Direction direction);
    event LimitsUpdated(uint256 maxPerTx, uint256 dailyLimitPerWallet, uint256 cooldownSeconds, uint32 requireAttestationCount);
    event ComplianceGateUpdated(address indexed gate);
    event EventRegistryUpdated(address indexed registry);

    constructor(
        address admin,
        IERC20 settlementToken_,
        ComplianceGate complianceGate_,
        EventRegistry eventRegistry_,
        uint256 maxPerTx_,
        uint256 dailyLimitPerWallet_,
        uint256 cooldownSeconds_,
        uint32 requireAttestationCount_
    ) {
        require(admin != address(0), "admin required");
        settlementToken = settlementToken_;
        complianceGate = complianceGate_;
        eventRegistry = eventRegistry_;
        maxPerTx = maxPerTx_;
        dailyLimitPerWallet = dailyLimitPerWallet_;
        cooldownSeconds = cooldownSeconds_;
        requireAttestationCount = requireAttestationCount_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(RAMP_OPERATOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, COMPLIANCE_ADMIN);
        _setRoleAdmin(RAMP_OPERATOR, COMPLIANCE_ADMIN);
        emit LimitsUpdated(maxPerTx, dailyLimitPerWallet, cooldownSeconds, requireAttestationCount);
    }

    // --- admin ---
    function setComplianceGate(ComplianceGate gate) external onlyRole(COMPLIANCE_ADMIN) {
        complianceGate = gate;
        emit ComplianceGateUpdated(address(gate));
    }

    function setEventRegistry(EventRegistry registry) external onlyRole(COMPLIANCE_ADMIN) {
        eventRegistry = registry;
        emit EventRegistryUpdated(address(registry));
    }

    function setLimits(
        uint256 maxPerTx_,
        uint256 dailyLimitPerWallet_,
        uint256 cooldownSeconds_,
        uint32 requireAttestationCount_
    ) external onlyRole(DAO_COUNCIL) {
        maxPerTx = maxPerTx_;
        dailyLimitPerWallet = dailyLimitPerWallet_;
        cooldownSeconds = cooldownSeconds_;
        requireAttestationCount = requireAttestationCount_;
        emit LimitsUpdated(maxPerTx_, dailyLimitPerWallet_, cooldownSeconds_, requireAttestationCount_);
    }

    // --- internal helpers ---
    function _checkEvent(bytes32 eid) internal view {
        require(address(eventRegistry) != address(0), "event registry not set");
        require(eventRegistry.statusOf(eid) == EventRegistry.EventStatus.VERIFIED, "event not verified");
        if (requireAttestationCount > 0) {
            EventRegistry.EventRecord memory rec = eventRegistry.getEvent(eid);
            require(rec.attestCount >= requireAttestationCount, "not enough attestations");
        }
    }

    function _checkLimits(address wallet, uint256 amount) internal {
        if (maxPerTx > 0) {
            require(amount <= maxPerTx, "over maxPerTx");
        }
        uint64 today = uint64(block.timestamp / 1 days);
        if (dailyStart[wallet] != today) {
            dailyStart[wallet] = today;
            dailyAmount[wallet] = 0;
        }
        if (dailyLimitPerWallet > 0) {
            require(dailyAmount[wallet] + amount <= dailyLimitPerWallet, "over daily limit");
        }
        if (cooldownSeconds > 0 && lastOpAt[wallet] != 0) {
            require(block.timestamp - lastOpAt[wallet] >= cooldownSeconds, "cooldown");
        }
        dailyAmount[wallet] += amount;
        lastOpAt[wallet] = uint64(block.timestamp);
    }

    // --- flows ---
    function requestCashIn(bytes32 eid, uint256 amount, bytes32 paymentRefHash) external {
        _request(eid, amount, paymentRefHash, Direction.CASH_IN, msg.sender);
        emit CashInRequested(eid, msg.sender, amount, paymentRefHash);
    }

    function requestCashOut(bytes32 eid, uint256 amount, bytes32 payoutRefHash) external {
        // escrow tokens first
        require(settlementToken.transferFrom(msg.sender, address(this), amount), "escrow transfer failed");
        _request(eid, amount, payoutRefHash, Direction.CASH_OUT, msg.sender);
        emit CashOutRequested(eid, msg.sender, amount, payoutRefHash);
    }

    function _request(bytes32 eid, uint256 amount, bytes32 refHash, Direction direction, address wallet) internal {
        require(amount > 0, "amount required");
        require(eid != bytes32(0), "eid required");
        require(operations[eid].status == Status.NONE, "eid exists");
        complianceGate.validateWithEvent(wallet, eid);
        _checkEvent(eid);
        _checkLimits(wallet, amount);

        operations[eid] = Operation({
            wallet: wallet,
            amount: amount,
            direction: direction,
            status: Status.REQUESTED,
            paymentRefHash: refHash,
            confirmationVID: bytes32(0),
            confirmedBy: address(0),
            requestedAt: uint64(block.timestamp),
            settledAt: 0
        });
    }

    function confirmCashIn(bytes32 eid, bytes32 confirmationVID) external onlyRole(RAMP_OPERATOR) {
        _confirm(eid, confirmationVID, Direction.CASH_IN);
        emit CashInConfirmed(eid, confirmationVID, msg.sender);
    }

    function confirmCashOut(bytes32 eid, bytes32 confirmationVID) external onlyRole(RAMP_OPERATOR) {
        _confirm(eid, confirmationVID, Direction.CASH_OUT);
        emit CashOutConfirmed(eid, confirmationVID, msg.sender);
    }

    function _confirm(bytes32 eid, bytes32 confirmationVID, Direction expectedDir) internal {
        require(confirmationVID != bytes32(0), "confirmation VID required");
        Operation storage op = operations[eid];
        require(op.status == Status.REQUESTED, "invalid status");
        require(op.direction == expectedDir, "direction mismatch");
        op.status = Status.CONFIRMED;
        op.confirmationVID = confirmationVID;
        op.confirmedBy = msg.sender;
    }

    function settle(bytes32 eid) external {
        Operation storage op = operations[eid];
        require(op.status == Status.CONFIRMED, "not confirmed");
        _checkEvent(eid);
        op.status = Status.SETTLED;
        op.settledAt = uint64(block.timestamp);

        if (op.direction == Direction.CASH_IN) {
            require(settlementToken.transfer(op.wallet, op.amount), "payout failed");
        } else if (op.direction == Direction.CASH_OUT) {
            address receiver = op.confirmedBy != address(0) ? op.confirmedBy : msg.sender;
            require(settlementToken.transfer(receiver, op.amount), "remit failed");
        }
        emit Settled(eid, op.amount, op.direction);
    }

    function getOperation(bytes32 eid) external view returns (Operation memory) {
        return operations[eid];
    }
}
