// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ComplianceExecutionBridge
/// @notice Executes approved compliance actions with an allowlist of targets/selectors.
contract ComplianceExecutionBridge is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct Action {
        address target;
        bytes data;
        bytes32 dataHash;
        bool exists;
        bool executed;
    }

    address public dao;
    mapping(uint256 => Action) private actions;
    mapping(address => mapping(bytes4 => bool)) private allowedSelectors;

    event DaoSet(address indexed dao);
    event AllowedSelectorSet(address indexed target, bytes4 selector, bool allowed);
    event ActionRegistered(uint256 indexed proposalId, address indexed target, bytes4 selector, bytes32 dataHash);
    event ComplianceActionExecuted(uint256 indexed proposalId, address indexed target, bytes4 selector, bytes32 dataHash);

    constructor(address admin, address dao_) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
        dao = dao_;
        emit DaoSet(dao_);
    }

    function setDao(address dao_) external onlyRole(COMPLIANCE_ADMIN) {
        dao = dao_;
        emit DaoSet(dao_);
    }

    function setAllowedSelector(address target, bytes4 selector, bool allowed) external {
        require(hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(DAO_COUNCIL, msg.sender), "not authorized");
        allowedSelectors[target][selector] = allowed;
        emit AllowedSelectorSet(target, selector, allowed);
    }

    function registerAction(uint256 proposalId, address target, bytes calldata data)
        external
        onlyRole(COMPLIANCE_ADMIN)
    {
        require(target != address(0), "target required");
        require(data.length >= 4, "invalid data");
        require(!actions[proposalId].exists, "action exists");

        bytes4 selector = bytes4(data);
        require(allowedSelectors[target][selector], "selector not allowed");

        bytes32 dataHash = keccak256(abi.encodePacked(target, data));
        actions[proposalId] = Action({
            target: target,
            data: data,
            dataHash: dataHash,
            exists: true,
            executed: false
        });

        emit ActionRegistered(proposalId, target, selector, dataHash);
    }

    function executeAction(uint256 proposalId) external {
        require(msg.sender == dao, "only dao");
        Action storage action = actions[proposalId];
        require(action.exists, "action missing");
        require(!action.executed, "action executed");

        bytes4 selector = bytes4(action.data);
        require(allowedSelectors[action.target][selector], "selector not allowed");

        (bool success, ) = action.target.call(action.data);
        require(success, "execution failed");
        action.executed = true;
        emit ComplianceActionExecuted(proposalId, action.target, selector, action.dataHash);
    }

    function actionHash(uint256 proposalId) external view returns (bytes32) {
        return actions[proposalId].dataHash;
    }

    function actionInfo(uint256 proposalId) external view returns (Action memory) {
        return actions[proposalId];
    }
}
