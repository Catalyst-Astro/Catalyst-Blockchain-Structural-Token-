// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IIdentitySBT.sol";

/// @title CatalystIdentitySBT
/// @notice Soulbound identity token representing verified KYC/AML status (no PII).
contract CatalystIdentitySBT is ERC721, AccessControl, IIdentitySBT {
    bytes32 public constant IDENTITY_MINTER = keccak256("IDENTITY_MINTER");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct IdentityInfo {
        uint8 userTypeCode;
        uint8 kycLevelCode;
        Status status;
        uint64 validUntil;
        bytes32 attestationHash;
        uint64 updatedAt;
        bytes32 reasonHash;
    }

    mapping(address => uint256) private tokenIdOfWallet;
    mapping(uint256 => IdentityInfo) private identityByToken;

    event IdentityMinted(
        address indexed wallet,
        uint256 indexed tokenId,
        uint8 userTypeCode,
        uint8 kycLevelCode,
        uint64 validUntil,
        bytes32 attestationHash
    );
    event IdentitySuspended(address indexed wallet, bytes32 reasonHash, uint64 timestamp);
    event IdentityRevoked(address indexed wallet, bytes32 reasonHash, uint64 timestamp);
    event IdentityRenewed(address indexed wallet, uint64 validUntil, bytes32 attestationHash);
    event IdentityExpired(address indexed wallet, uint64 timestamp);

    constructor(address admin) ERC721("Catalyst Identity", "CID") {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(IDENTITY_MINTER, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(IDENTITY_MINTER, COMPLIANCE_ADMIN);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function mintIdentity(
        address wallet,
        uint8 userTypeCode,
        uint8 kycLevelCode,
        uint64 validUntil,
        bytes32 attestationHash
    ) external onlyRole(IDENTITY_MINTER) {
        require(wallet != address(0), "wallet required");
        require(attestationHash != bytes32(0), "attestation hash required");
        require(tokenIdOfWallet[wallet] == 0, "identity exists");

        uint256 tokenId = uint256(uint160(wallet));
        tokenIdOfWallet[wallet] = tokenId;
        identityByToken[tokenId] = IdentityInfo({
            userTypeCode: userTypeCode,
            kycLevelCode: kycLevelCode,
            status: Status.ACTIVE,
            validUntil: validUntil,
            attestationHash: attestationHash,
            updatedAt: uint64(block.timestamp),
            reasonHash: bytes32(0)
        });

        _safeMint(wallet, tokenId);
        emit IdentityMinted(wallet, tokenId, userTypeCode, kycLevelCode, validUntil, attestationHash);
    }

    function suspendIdentity(address wallet, bytes32 reasonHash) external onlyRole(COMPLIANCE_ADMIN) {
        uint256 tokenId = tokenIdOfWallet[wallet];
        require(tokenId != 0, "identity missing");
        IdentityInfo storage info = identityByToken[tokenId];
        info.status = Status.SUSPENDED;
        info.reasonHash = reasonHash;
        info.updatedAt = uint64(block.timestamp);
        emit IdentitySuspended(wallet, reasonHash, uint64(block.timestamp));
    }

    function revokeIdentity(address wallet, bytes32 reasonHash) external onlyRole(COMPLIANCE_ADMIN) {
        uint256 tokenId = tokenIdOfWallet[wallet];
        require(tokenId != 0, "identity missing");
        IdentityInfo storage info = identityByToken[tokenId];
        info.status = Status.REVOKED;
        info.reasonHash = reasonHash;
        info.updatedAt = uint64(block.timestamp);
        emit IdentityRevoked(wallet, reasonHash, uint64(block.timestamp));
    }

    function renewIdentity(address wallet, uint64 newValidUntil, bytes32 newAttestationHash)
        external
        onlyRole(IDENTITY_MINTER)
    {
        uint256 tokenId = tokenIdOfWallet[wallet];
        require(tokenId != 0, "identity missing");
        require(newAttestationHash != bytes32(0), "attestation hash required");
        IdentityInfo storage info = identityByToken[tokenId];
        info.status = Status.ACTIVE;
        info.validUntil = newValidUntil;
        info.attestationHash = newAttestationHash;
        info.updatedAt = uint64(block.timestamp);
        info.reasonHash = bytes32(0);
        emit IdentityRenewed(wallet, newValidUntil, newAttestationHash);
    }

    function markExpired(address wallet) external {
        uint256 tokenId = tokenIdOfWallet[wallet];
        require(tokenId != 0, "identity missing");
        IdentityInfo storage info = identityByToken[tokenId];
        if (info.status == Status.ACTIVE && _isExpired(info)) {
            info.status = Status.EXPIRED;
            info.updatedAt = uint64(block.timestamp);
            emit IdentityExpired(wallet, uint64(block.timestamp));
        }
    }

    function isIdentityValid(address wallet) external view returns (bool) {
        uint256 tokenId = tokenIdOfWallet[wallet];
        if (tokenId == 0) {
            return false;
        }
        IdentityInfo storage info = identityByToken[tokenId];
        if (info.status != Status.ACTIVE) {
            return false;
        }
        if (_isExpired(info)) {
            return false;
        }
        return true;
    }

    function identityInfo(address wallet)
        external
        view
        returns (
            uint8 userTypeCode,
            uint8 kycLevelCode,
            Status status,
            uint64 validUntil,
            bytes32 attestationHash
        )
    {
        uint256 tokenId = tokenIdOfWallet[wallet];
        if (tokenId == 0) {
            return (0, 0, Status.NONE, 0, bytes32(0));
        }
        IdentityInfo storage info = identityByToken[tokenId];
        Status effectiveStatus = _effectiveStatus(info);
        return (info.userTypeCode, info.kycLevelCode, effectiveStatus, info.validUntil, info.attestationHash);
    }

    function tokenIdOf(address wallet) external view returns (uint256) {
        return tokenIdOfWallet[wallet];
    }

    function identityRecordOf(address wallet) external view returns (IdentityInfo memory) {
        uint256 tokenId = tokenIdOfWallet[wallet];
        IdentityInfo memory info = identityByToken[tokenId];
        info.status = _effectiveStatus(info);
        return info;
    }

    function approve(address, uint256) public pure override {
        revert("soulbound");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("soulbound");
    }

    function transferFrom(address, address, uint256) public pure override {
        revert("soulbound");
    }

    function safeTransferFrom(address, address, uint256) public pure override {
        revert("soulbound");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("soulbound");
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        require(from == address(0) || to == address(0), "soulbound");
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _effectiveStatus(IdentityInfo storage info) internal view returns (Status) {
        if (info.status == Status.ACTIVE && _isExpired(info)) {
            return Status.EXPIRED;
        }
        return info.status;
    }

    function _effectiveStatus(IdentityInfo memory info) internal view returns (Status) {
        if (info.status == Status.ACTIVE && _isExpired(info)) {
            return Status.EXPIRED;
        }
        return info.status;
    }

    function _isExpired(IdentityInfo storage info) internal view returns (bool) {
        return info.validUntil != 0 && block.timestamp > info.validUntil;
    }

    function _isExpired(IdentityInfo memory info) internal view returns (bool) {
        return info.validUntil != 0 && block.timestamp > info.validUntil;
    }
}
