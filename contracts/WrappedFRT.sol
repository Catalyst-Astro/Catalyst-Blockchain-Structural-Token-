// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title Wrapped Fractal Token
/// @notice ERC20 token minted by the bridge on a secondary chain.
contract WrappedFRT is ERC20, Ownable, ReentrancyGuard {
    address public bridgeAuthority;

    event BridgeMint(address indexed to, uint256 amount);
    event WrappedFRTBurned(address indexed user, string destChain, uint256 amount, bytes32 burnId);

    modifier onlyBridge() {
        require(msg.sender == bridgeAuthority, "not bridge");
        _;
    }

    constructor() ERC20("Wrapped FRT", "wFRT") {}

    function setBridgeAuthority(address authority) external onlyOwner {
        bridgeAuthority = authority;
    }

    /// @notice Mint wrapped tokens to user when FRT are locked on main chain.
    function mintWrappedFRT(address to, uint256 amount) external onlyBridge {
        _mint(to, amount);
        emit BridgeMint(to, amount);
    }

    /// @notice Burn wrapped tokens and emit metadata to unlock on main chain.
    function burnWrappedFRT(uint256 amount, string calldata destChain) external nonReentrant {
        _burn(msg.sender, amount);
        bytes32 burnId = keccak256(abi.encodePacked(msg.sender, destChain, amount, block.timestamp, block.number));
        emit WrappedFRTBurned(msg.sender, destChain, amount, burnId);
    }
}
