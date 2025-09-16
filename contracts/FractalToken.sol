
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "./extensions/PurposeTag.sol";

/**
 * @title FractalToken
 * @notice ERC20 token with permit, pausable transfers and optional narrative tags.
 * Designed for cooperative DAO ecosystems and symbolic token flows.
 */
contract FractalToken is ERC20, ERC20Burnable, ERC20Permit, Pausable, Ownable, PurposeTag {
    /**
     * @dev Mint initial supply to deployer and initialize ownership.
     * @param initialSupply Amount of tokens minted to the owner on deployment.
     */
    constructor(uint256 initialSupply)
        ERC20("Fractal Token", "FRT")
        ERC20Permit("Fractal Token")
        Ownable(msg.sender)
    {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Mint new tokens to an address. Restricted to owner.
=======

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Fractal Token (FRT)
/// @notice Basic ERC20 token used for staking in the Fractal ecosystem.
contract FractalToken is ERC20, Ownable {
    constructor(uint256 initialSupply)
        ERC20("Fractal Token", "FRT")
        Ownable(msg.sender)
    {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Mint new tokens to an account.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
=======

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FractalToken
/// @dev Simple ERC20 token with ERC-2612 permit and owner controlled minting.
contract FractalToken is ERC20, ERC20Permit, Ownable {
    constructor(uint256 initialSupply, address initialOwner)
        ERC20("Fractal Token", "FRT")
        ERC20Permit("Fractal Token")
        Ownable(initialOwner)
    {
        _mint(initialOwner, initialSupply);
    }

    /// @notice Mint new tokens. Only owner can call.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
=======

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title FractalToken (FRT)
 * @notice ERC-20 token including ERC-2612 permit functionality.
 *
 * This implementation uses OpenZeppelin libraries to ensure
 * cryptographic security and compatibility with common auditing
 * standards. The code follows recommendations from Swiss FINMA
 * regarding clear documentation and adherence to best practices.
 *
 * Compatibility: Gnosis Safe, Ethers.js, Hardhat, Remix and Truffle.
 */
contract FractalToken is ERC20Permit {
    /**
     * @notice Mint initial supply and set up EIP712 domain for permits.
     * @param initialSupply Amount of tokens minted to the deployer.
     */
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./FRTAuditTrail.sol";
import "./enums/OperationType.sol";

/// @title Fractal Token
/// @notice ERC-20 token with permit functionality, minting and pausable transfers.
/// Implements standards per Swiss FINMA guidelines.
contract FractalToken is ERC20, ERC20Permit, Ownable, Pausable {
    // Store the initial token supply for audit transparency
    uint256 private immutable _initialSupply;

    /// @notice Optional audit trail contract for compliant tracing
    FRTAuditTrail public auditTrail;

    // Temporary storage for purpose hash during audited operations
    bytes32 private _pendingPurposeHash;

    /// @notice Deploy the token and mint the full initial supply to the deployer.
    /// @param initialSupply Amount of tokens to mint on deployment (in wei).

    constructor(uint256 initialSupply)
        ERC20("Fractal Token", "FRT")
        ERC20Permit("Fractal Token")
    {

        _mint(msg.sender, initialSupply);
    }
=======
        _initialSupply = initialSupply;
        _mint(msg.sender, initialSupply);
    }

    /// @notice Set the external audit trail contract.
    function setAuditTrail(FRTAuditTrail trail) external onlyOwner {
        auditTrail = trail;
    }

    /// @notice Return the initial supply minted at deployment.
    function initialSupply() external view returns (uint256) {
        return _initialSupply;
    }

    /// @notice Mint new tokens to `to`. Only callable by the contract owner.

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }


    /// @notice Burn tokens from the caller while not paused.
    function burn(uint256 amount) public override whenNotPaused {
        super.burn(amount);
    }

    /// @notice Pause all token transfers.
=======
    /// @notice Mint with an audit purpose hash.
    function mintWithPurpose(address to, uint256 amount, bytes32 purposeHash) external onlyOwner {
        _pendingPurposeHash = purposeHash;
        _mint(to, amount);
    }

    /// @notice Burn `amount` of the caller's tokens.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Transfer with an audit purpose hash.
    function transferWithPurpose(address to, uint256 amount, bytes32 purposeHash) external returns (bool) {
        _pendingPurposeHash = purposeHash;
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Burn with an audit purpose hash.
    function burnWithPurpose(uint256 amount, bytes32 purposeHash) external {
        _pendingPurposeHash = purposeHash;
        _burn(msg.sender, amount);
    }

    /// @notice Pause all token transfers. Callable only by the owner.

    function pause() external onlyOwner {
        _pause();
    }


    /// @notice Unpause token transfers.
=======
    /// @notice Unpause token transfers. Callable only by the owner.

    function unpause() external onlyOwner {
        _unpause();
    }


    /// @notice Attach a narrative purpose to the next DAO interaction.
    function purposeTag(string memory purpose) external whenNotPaused {
        _tagPurpose(_msgSender(), purpose);
    }

    /// @dev Hook to block transfers while paused.
    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        super._update(from, to, amount);
    }
}
=======
    /// @dev Prevent token transfers while paused by using the ERC-20 hook.
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override
    {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "FractalToken: token transfer while paused");
    }


    /// @dev After transfer hook used to emit audit trail events.
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override
    {
        super._afterTokenTransfer(from, to, amount);
        if (address(auditTrail) != address(0)) {
            OperationType op = OperationType.TRANSFER;
            if (from == address(0)) {
                op = OperationType.MINT;
            } else if (to == address(0)) {
                op = OperationType.BURN;
            }
            auditTrail.emitAuditRecord(from, to, amount, op, _pendingPurposeHash);
        }
        _pendingPurposeHash = 0;
    }


=======

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./TraceRegistry.sol";
import "./enums/EventType.sol";

/**
 * @title FractalToken
 * @dev ERC20 token that records operational events in a TraceRegistry.
 */
contract FractalToken is ERC20, ERC20Burnable, Ownable {
    TraceRegistry public immutable traceRegistry;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        TraceRegistry registry
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        traceRegistry = registry;
        // Attempt to authorize this token in the registry; will revert if caller is not registry owner
        registry.authorize(address(this));
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mint tokens to an address.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        traceRegistry.recordTrace(EventType.MINT, msg.sender, to, amount, bytes32(0));
    }

    /**
     * @dev Override burn to record trace.
     */
    function burn(uint256 amount) public override onlyOwner {
        super.burn(amount);
        traceRegistry.recordTrace(EventType.BURN, msg.sender, address(0), amount, bytes32(0));
    }

    /**
     * @dev Override ERC20 _afterTokenTransfer to trace transfers.
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._afterTokenTransfer(from, to, amount);
        if (from != address(0) && to != address(0)) {
            traceRegistry.recordTrace(EventType.TRANSFER, from, to, amount, bytes32(0));
        }
    }

    /**
     * @dev Expose trace data retrieval.
     */
    function getTraceByAddress(address account) external view returns (TraceLog[] memory) {
        return traceRegistry.getTraceByAddress(account);
    }

    function exportAsJSON(address account) external view returns (string memory) {
        return traceRegistry.exportAsJSON(account);
    }
=======
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Fractal Token (FRT)
/// @notice Basic ERC20 token to be locked in the bridge vault.
contract FractalToken is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("Fractal Token", "FRT") {
        _mint(msg.sender, initialSupply);
    }

