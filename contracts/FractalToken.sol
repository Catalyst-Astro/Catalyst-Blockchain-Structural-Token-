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
}
