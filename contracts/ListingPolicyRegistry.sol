// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ListingPolicyRegistry
/// @notice Controls listing phases, approved venues, and transfer caps.
contract ListingPolicyRegistry is AccessControl {
    bytes32 public constant LISTING_ADMIN = keccak256("LISTING_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");
    bytes32 public constant ENFORCER_ROLE = keccak256("ENFORCER_ROLE");

    struct Policy {
        uint8 phase;
        uint256 volumeCap;
        uint32 txCap;
        uint32 periodSeconds;
        bytes32 policyHash;
        uint32 version;
        bool exists;
    }

    struct VenueConfig {
        bool approved;
        uint32 phaseMask;
        uint256 volumeCap;
        uint32 txCap;
        uint32 periodSeconds;
        bool exists;
    }

    struct Usage {
        uint64 windowStart;
        uint64 txCount;
        uint256 volumeUsed;
    }

    mapping(uint32 => Policy) private policies;
    uint32 private activeVersion;
    uint32 private nextVersion;

    mapping(address => VenueConfig) private venues;
    mapping(address => Usage) private usage;

    event ListingPolicyPublished(uint32 version, bytes32 policyHash);
    event ListingPhaseActivated(uint8 phase, uint32 version);
    event VenueApproved(address indexed venue, uint32 phaseMask);
    event VenueRevoked(address indexed venue);
    event VenueCapsUpdated(address indexed venue, uint256 volumeCap, uint32 txCap, uint32 periodSeconds);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LISTING_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _grantRole(ENFORCER_ROLE, admin);
        _setRoleAdmin(LISTING_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, LISTING_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(ENFORCER_ROLE, LISTING_ADMIN);
    }

    function publishPolicy(uint8 phase, uint256 volumeCap, uint32 txCap, uint32 periodSeconds, bytes32 policyHash)
        external
        onlyRole(LISTING_ADMIN)
        returns (uint32 version)
    {
        require(policyHash != bytes32(0), "policy hash required");
        version = nextVersion + 1;
        nextVersion = version;
        policies[version] = Policy({
            phase: phase,
            volumeCap: volumeCap,
            txCap: txCap,
            periodSeconds: periodSeconds,
            policyHash: policyHash,
            version: version,
            exists: true
        });
        emit ListingPolicyPublished(version, policyHash);
    }

    function activatePolicy(uint32 version) external onlyRole(DAO_COUNCIL) {
        Policy storage policy = policies[version];
        require(policy.exists, "policy missing");
        activeVersion = version;
        emit ListingPhaseActivated(policy.phase, version);
    }

    function setVenue(
        address venue,
        bool approved,
        uint32 phaseMask,
        uint256 volumeCap,
        uint32 txCap,
        uint32 periodSeconds
    ) external onlyRole(LISTING_ADMIN) {
        require(venue != address(0), "venue required");
        venues[venue] = VenueConfig({
            approved: approved,
            phaseMask: phaseMask,
            volumeCap: volumeCap,
            txCap: txCap,
            periodSeconds: periodSeconds,
            exists: true
        });
        if (approved) {
            emit VenueApproved(venue, phaseMask);
        } else {
            emit VenueRevoked(venue);
        }
        emit VenueCapsUpdated(venue, volumeCap, txCap, periodSeconds);
    }

    function isVenueApproved(address venue) external view returns (bool) {
        VenueConfig storage config = venues[venue];
        return config.exists && config.approved;
    }

    function isTransferAllowed(address from, address to, uint256 amount) external view returns (bool) {
        Policy memory policy = policies[activeVersion];
        if (!policy.exists) {
            return false;
        }
        if (!_isVenueAllowed(from, amount, policy)) {
            return false;
        }
        if (!_isVenueAllowed(to, amount, policy)) {
            return false;
        }
        return true;
    }

    function consumeTransfer(address from, address to, uint256 amount) external onlyRole(ENFORCER_ROLE) {
        Policy memory policy = policies[activeVersion];
        require(policy.exists, "policy missing");
        _consumeVenue(from, amount, policy);
        _consumeVenue(to, amount, policy);
    }

    function activePolicy() external view returns (Policy memory) {
        return policies[activeVersion];
    }

    function activePolicyVersion() external view returns (uint32) {
        return activeVersion;
    }

    function policyOf(uint32 version) external view returns (Policy memory) {
        return policies[version];
    }

    function venueOf(address venue) external view returns (VenueConfig memory) {
        return venues[venue];
    }

    function usageOf(address venue) external view returns (Usage memory) {
        return usage[venue];
    }

    function _isVenueAllowed(address venue, uint256 amount, Policy memory policy) internal view returns (bool) {
        VenueConfig memory config = venues[venue];
        if (!config.exists) {
            return true;
        }
        if (!config.approved) {
            return false;
        }
        uint32 mask = config.phaseMask;
        if (mask != 0 && (mask & (1 << policy.phase)) == 0) {
            return false;
        }
        (uint256 volumeCap, uint32 txCap, uint32 periodSeconds) = _effectiveCaps(config, policy);
        if (volumeCap == 0 && txCap == 0) {
            return true;
        }

        Usage memory current = _usageFor(venue, periodSeconds);
        if (volumeCap > 0 && current.volumeUsed + amount > volumeCap) {
            return false;
        }
        if (txCap > 0 && current.txCount + 1 > txCap) {
            return false;
        }
        return true;
    }

    function _consumeVenue(address venue, uint256 amount, Policy memory policy) internal {
        VenueConfig memory config = venues[venue];
        if (!config.exists) {
            return;
        }
        require(config.approved, "venue not approved");
        uint32 mask = config.phaseMask;
        if (mask != 0) {
            require((mask & (1 << policy.phase)) != 0, "phase not allowed");
        }

        (uint256 volumeCap, uint32 txCap, uint32 periodSeconds) = _effectiveCaps(config, policy);
        if (volumeCap == 0 && txCap == 0) {
            return;
        }

        Usage storage current = usage[venue];
        uint64 windowStart = _currentWindowStart(periodSeconds);
        if (current.windowStart != windowStart) {
            current.windowStart = windowStart;
            current.volumeUsed = 0;
            current.txCount = 0;
        }

        if (volumeCap > 0) {
            require(current.volumeUsed + amount <= volumeCap, "volume cap exceeded");
            current.volumeUsed += amount;
        }
        if (txCap > 0) {
            require(current.txCount + 1 <= txCap, "tx cap exceeded");
            current.txCount += 1;
        }
    }

    function _effectiveCaps(VenueConfig memory config, Policy memory policy)
        internal
        pure
        returns (uint256 volumeCap, uint32 txCap, uint32 periodSeconds)
    {
        volumeCap = config.volumeCap > 0 ? config.volumeCap : policy.volumeCap;
        txCap = config.txCap > 0 ? config.txCap : policy.txCap;
        periodSeconds = config.periodSeconds > 0 ? config.periodSeconds : policy.periodSeconds;
    }

    function _usageFor(address venue, uint32 periodSeconds) internal view returns (Usage memory) {
        Usage memory current = usage[venue];
        uint64 windowStart = _currentWindowStart(periodSeconds);
        if (current.windowStart != windowStart) {
            current.windowStart = windowStart;
            current.volumeUsed = 0;
            current.txCount = 0;
        }
        return current;
    }

    function _currentWindowStart(uint32 periodSeconds) internal view returns (uint64) {
        if (periodSeconds == 0) {
            return 0;
        }
        return uint64(block.timestamp - (block.timestamp % periodSeconds));
    }
}
