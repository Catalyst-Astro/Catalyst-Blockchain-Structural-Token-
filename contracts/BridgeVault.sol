// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title BridgeVault
/// @notice Locks FRT on the main chain and releases them when the wrapped
/// counterpart is burned on a secondary chain.
contract BridgeVault is Ownable, ReentrancyGuard {
    IERC20 public immutable token;
    address public bridgeAuthority;

    mapping(bytes32 => bool) public processedBurns;

    event TokensLocked(address indexed user, string destChain, uint256 amount, bytes32 lockId);
    event TokensReleased(address indexed user, uint256 amount, bytes32 burnTxHash);

    modifier onlyBridge() {
        require(msg.sender == bridgeAuthority, "not bridge");
        _;
    }

    constructor(address _token) Ownable() {
        token = IERC20(_token);
    }

    function setBridgeAuthority(address authority) external onlyOwner {
        bridgeAuthority = authority;
    }

    /// @notice Lock FRT and emit metadata for off-chain bridge listeners.
    function lockTokens(uint256 amount, string calldata destChain) external nonReentrant {
        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed");
        bytes32 lockId = keccak256(abi.encodePacked(msg.sender, destChain, amount, block.timestamp, block.number));
        emit TokensLocked(msg.sender, destChain, amount, lockId);
    }

    /// @notice Release original FRT when burn is proven on the other chain.
    function releaseTokens(address user, uint256 amount, bytes32 burnTxHash) external onlyBridge nonReentrant {
        require(!processedBurns[burnTxHash], "already processed");
        processedBurns[burnTxHash] = true;
        require(token.transfer(user, amount), "transfer failed");
        emit TokensReleased(user, amount, burnTxHash);
    }
}
