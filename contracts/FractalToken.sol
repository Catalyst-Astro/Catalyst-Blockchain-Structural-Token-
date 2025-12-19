
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IAcceptanceRegistry.sol";
import "./interfaces/IDisclosureRegistry.sol";
import "./interfaces/ITokenUsePolicy.sol";
import "./interfaces/IWhitelistRegistry.sol";

/// @title Fractal Token (FRT)
/// @notice Cohesive ERC20 token with ERC-2612 permit, owner-controlled minting, pausable transfers and simple burn.
contract FractalToken is ERC20, ERC20Permit, Ownable, Pausable {
    uint256 private immutable _initialSupply;
    bytes32 private _pendingPurposeHash;
    bool public enforcementEnabled;

    IDisclosureRegistry public disclosureRegistry;
    IAcceptanceRegistry public acceptanceRegistry;
    ITokenUsePolicy public tokenUsePolicy;
    IWhitelistRegistry public whitelistRegistry;
    bool public localWhitelistEnabled;
    mapping(address => bool) private _localWhitelist;

    event EnforcementEnabled(bool enabled);
    event DisclosureRegistrySet(address indexed registry);
    event AcceptanceRegistrySet(address indexed registry);
    event TokenUsePolicySet(address indexed policy);
    event WhitelistRegistrySet(address indexed registry);
    event LocalWhitelistUpdated(address indexed account, bool allowed);
    event LocalWhitelistEnabled(bool enabled);

    constructor(uint256 initialSupply_)
        ERC20("Fractal Token", "FRT")
        ERC20Permit("Fractal Token")
    {
        _initialSupply = initialSupply_;
        enforcementEnabled = false;
        _mint(msg.sender, initialSupply_);
    }

    /// @notice Return the initial supply minted at deployment.
    function initialSupply() external view returns (uint256) {
        return _initialSupply;
    }

    /// @notice Mint new tokens. Only owner can call.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Burn caller's tokens.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Pause all token transfers. Callable only by the owner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause token transfers. Callable only by the owner.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Toggle compliance enforcement for transfers.
    function setEnforcementEnabled(bool enabled) external onlyOwner {
        enforcementEnabled = enabled;
        emit EnforcementEnabled(enabled);
    }

    /// @notice Set disclosure registry used for active version checks.
    function setDisclosureRegistry(address registry) external onlyOwner {
        disclosureRegistry = IDisclosureRegistry(registry);
        emit DisclosureRegistrySet(registry);
    }

    /// @notice Set acceptance registry used to validate disclosure acceptance.
    function setAcceptanceRegistry(address registry) external onlyOwner {
        acceptanceRegistry = IAcceptanceRegistry(registry);
        emit AcceptanceRegistrySet(registry);
    }

    /// @notice Set token use policy for enforcement.
    function setTokenUsePolicy(address policy) external onlyOwner {
        tokenUsePolicy = ITokenUsePolicy(policy);
        emit TokenUsePolicySet(policy);
    }

    /// @notice Set external whitelist registry (disables local whitelist).
    function setWhitelistRegistry(address registry) external onlyOwner {
        whitelistRegistry = IWhitelistRegistry(registry);
        localWhitelistEnabled = false;
        emit WhitelistRegistrySet(registry);
    }

    /// @notice Enable or disable local whitelist fallback.
    function setLocalWhitelistEnabled(bool enabled) external onlyOwner {
        localWhitelistEnabled = enabled;
        emit LocalWhitelistEnabled(enabled);
    }

    /// @notice Manage the local whitelist when enabled.
    function setLocalWhitelist(address account, bool allowed) external onlyOwner {
        _localWhitelist[account] = allowed;
        emit LocalWhitelistUpdated(account, allowed);
    }

    /// @dev Prevent token transfers while paused by using the ERC-20 hook.
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20)
    {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "FractalToken: token transfer while paused");
        _enforcePolicies(from, to);
    }

    /// @dev Clear any pending purpose hash after transfers/burns/mints.
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20)
    {
        super._afterTokenTransfer(from, to, amount);
        _pendingPurposeHash = bytes32(0);
    }

    function _enforcePolicies(address from, address to) internal view {
        if (!enforcementEnabled) {
            return;
        }

        require(address(tokenUsePolicy) != address(0), "policy not set");

        if (tokenUsePolicy.whitelistRequired()) {
            require(_isWhitelistConfigured(), "whitelist not configured");
            _requireWhitelisted(from);
            _requireWhitelisted(to);
        }

        if (tokenUsePolicy.disclosuresRequired()) {
            require(address(disclosureRegistry) != address(0), "disclosure registry not set");
            require(address(acceptanceRegistry) != address(0), "acceptance registry not set");
            uint256 activeVersion = disclosureRegistry.activeVersion();
            require(activeVersion != 0, "no active disclosure");
            _requireDisclosureAccepted(from, activeVersion);
            _requireDisclosureAccepted(to, activeVersion);
        }

        if (tokenUsePolicy.jurisdictionRequired()) {
            _requireJurisdictionAllowed(from);
            _requireJurisdictionAllowed(to);
        }

        if (tokenUsePolicy.lockupRequired() && from != address(0)) {
            uint64 lockup = tokenUsePolicy.lockupUntil(from);
            require(lockup == 0 || block.timestamp >= lockup, "lockup active");
        }

        if (tokenUsePolicy.paymentRestricted() && from != address(0) && to != address(0)) {
            require(_pendingPurposeHash != bytes32(0), "purpose required");
            require(tokenUsePolicy.isPurposeAllowed(_pendingPurposeHash), "purpose not allowed");
        }
    }

    function _requireWhitelisted(address account) internal view {
        if (account == address(0)) {
            return;
        }
        require(_isWhitelisted(account), "not whitelisted");
    }

    function _isWhitelistConfigured() internal view returns (bool) {
        return address(whitelistRegistry) != address(0) || localWhitelistEnabled;
    }

    function _isWhitelisted(address account) internal view returns (bool) {
        if (address(whitelistRegistry) != address(0)) {
            return whitelistRegistry.isWhitelisted(account);
        }
        if (localWhitelistEnabled) {
            return _localWhitelist[account];
        }
        return false;
    }

    function _requireDisclosureAccepted(address account, uint256 versionId) internal view {
        if (account == address(0)) {
            return;
        }
        require(acceptanceRegistry.hasAccepted(account, versionId), "disclosure not accepted");
    }

    function _requireJurisdictionAllowed(address account) internal view {
        if (account == address(0)) {
            return;
        }
        require(tokenUsePolicy.isJurisdictionAllowed(account), "jurisdiction blocked");
    }

    /// @notice Helper to perform transfer with a purpose hash (stored temporarily).
    function transferWithPurpose(address to, uint256 amount, bytes32 purposeHash) external returns (bool) {
        _pendingPurposeHash = purposeHash;
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Helper to mint with a purpose hash (only owner).
    function mintWithPurpose(address to, uint256 amount, bytes32 purposeHash) external onlyOwner {
        _pendingPurposeHash = purposeHash;
        _mint(to, amount);
    }

    /// @notice Helper to burn with a purpose hash.
    function burnWithPurpose(uint256 amount, bytes32 purposeHash) external {
        _pendingPurposeHash = purposeHash;
        _burn(msg.sender, amount);
    }
}

