// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IAssetRegistryValidator.sol";
import "./FractalAssetToken.sol";

/// @title FractalFundingVault
/// @notice Simple vault to collect funds for tokenized assets.
contract FractalFundingVault is AccessControl, Ownable {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    struct FundableProject {
        uint256 assetId;
        address assetToken;
        uint256 goal;
        uint256 totalContributed;
        bool validated;
    }

    /// @dev mapping projectId => project data
    mapping(uint256 => FundableProject) public projects;
    /// @dev mapping projectId => contributor => amount
    mapping(uint256 => mapping(address => uint256)) public contributions;
    /// @dev mapping projectId => contributor => claimed
    mapping(uint256 => mapping(address => bool)) public claimed;

    IAssetRegistryValidator public immutable registry;

    event ContributionReceived(uint256 indexed projectId, address indexed contributor, uint256 amount);
    event TokensClaimed(uint256 indexed projectId, address indexed contributor, uint256 amount);

    constructor(IAssetRegistryValidator registry_) Ownable(msg.sender) {
        registry = registry_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Register a new project for funding.
    function createProject(uint256 projectId, uint256 assetId, address assetToken, uint256 goal) external {
        require(registry.ownerOf(assetId) == msg.sender, "not asset owner");
        require(projects[projectId].assetId == 0, "exists");
        projects[projectId] = FundableProject(assetId, assetToken, goal, 0, false);
    }

    /// @notice Contribute Ether to a project.
    function contribute(uint256 projectId) external payable {
        FundableProject storage p = projects[projectId];
        require(p.assetId != 0, "missing project");
        contributions[projectId][msg.sender] += msg.value;
        p.totalContributed += msg.value;
        emit ContributionReceived(projectId, msg.sender, msg.value);
    }

    /// @notice Validators approve that funding is complete.
    function approveFunding(uint256 projectId) external onlyRole(VALIDATOR_ROLE) {
        projects[projectId].validated = true;
    }

    /// @notice Claim asset tokens proportional to contribution once validated.
    function claimToken(uint256 projectId) external {
        FundableProject storage p = projects[projectId];
        require(p.validated, "not validated");
        uint256 amount = contributions[projectId][msg.sender];
        require(amount > 0, "no contribution");
        require(!claimed[projectId][msg.sender], "claimed");
        claimed[projectId][msg.sender] = true;
        FractalAssetToken(p.assetToken).mintAssetToken(p.assetId, msg.sender, amount);
        emit TokensClaimed(projectId, msg.sender, amount);
    }
}
