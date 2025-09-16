
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./SymbolicEventLog.sol";

/// @title FractalStaking
/// @notice Stake FRT tokens with a purpose tied to a symbolic event.
contract FractalStaking {
    IERC20 public immutable frt;
    SymbolicEventLog public immutable eventLog;

    mapping(address => uint256) public staked;

    event Staked(
=======
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ISymbolicEventLog
 * @dev Interface for validating symbolic events.
 */
interface ISymbolicEventLog {
    function isEventoValido(uint256 eventoId) external view returns (bool);
}

/**
 * @title FractalStaking
 * @notice Permite a los usuarios bloquear tokens FRT con un proposito
 *         narrativo, vinculando arquetipos y eventos simbolicos.
 */
contract FractalStaking is Ownable {
    struct Stake {
        address user;
        uint256 amount;
        string purpose;
        string arquetipo;
        uint256 eventoId;
        uint256 timestamp;
        bool claimed;
    }

    // Bonus del 10% para stakes cuyo proposito contenga la palabra "ritual".
    uint256 public constant RITUAL_BONUS_BPS = 1000;

    IERC20 public immutable fractalToken;
    ISymbolicEventLog public symbolicEventLog;

    mapping(address => Stake[]) private userStakes;

    event StakeRealizado(

        address indexed user,
        uint256 amount,
        string purpose,
        string arquetipo,
        uint256 eventoId
    );

    constructor(IERC20 frtToken, SymbolicEventLog log) {
        frt = frtToken;
        eventLog = log;
    }

    /// @notice Stake tokens for a specific purpose validated by an event.
    function stakeWithPurpose(
        uint256 amount,
        string memory purpose,
        string memory arquetipo,
        uint256 evento_id
    ) external {
        require(eventLog.validateEvent(evento_id), "invalid event");
        require(frt.transferFrom(msg.sender, address(this), amount), "transfer failed");
        staked[msg.sender] += amount;
        emit Staked(msg.sender, amount, purpose, arquetipo, evento_id);
    }
}
=======
    event RecompensaNarrativa(address indexed user, uint256 amount);

    constructor(IERC20 token, ISymbolicEventLog eventLog) {
        fractalToken = token;
        symbolicEventLog = eventLog;
    }

    /**
     * @notice Bloquea tokens FRT con un proposito simbolico.
     */
    function stakeWithPurpose(
        uint256 amount,
        string calldata purpose,
        string calldata arquetipo,
        uint256 eventoId
    ) external {
        require(amount > 0, "amount 0");
        require(symbolicEventLog.isEventoValido(eventoId), "invalid event");
        require(
            fractalToken.transferFrom(msg.sender, address(this), amount),
            "transfer failed"
        );

        Stake memory s = Stake({
            user: msg.sender,
            amount: amount,
            purpose: purpose,
            arquetipo: arquetipo,
            eventoId: eventoId,
            timestamp: block.timestamp,
            claimed: false
        });
        userStakes[msg.sender].push(s);

        emit StakeRealizado(msg.sender, amount, purpose, arquetipo, eventoId);
    }

    /**
     * @notice Reclama la cantidad staked y un bonus opcional despues de 7 dias.
     * @param index Indice del stake a reclamar en el arreglo del usuario.
     */
    function claimReward(uint256 index) external {
        require(index < userStakes[msg.sender].length, "invalid index");
        Stake storage s = userStakes[msg.sender][index];
        require(!s.claimed, "claimed");
        require(block.timestamp >= s.timestamp + 7 days, "too early");

        uint256 reward = s.amount;
        if (_containsKeyword(s.purpose, "ritual")) {
            reward += (reward * RITUAL_BONUS_BPS) / 10000;
        }
        s.claimed = true;
        require(fractalToken.transfer(msg.sender, reward), "transfer failed");

        emit RecompensaNarrativa(msg.sender, reward);
    }

    /**
     * @notice Devuelve los stakes asociados a una direccion.
     */
    function getStakesByUser(address user) external view returns (Stake[] memory) {
        return userStakes[user];
    }

    // -------- utilidades internas --------

    function _containsKeyword(string memory text, string memory keyword) internal pure returns (bool) {
        bytes memory t = bytes(_toLower(text));
        bytes memory k = bytes(_toLower(keyword));
        if (k.length == 0 || k.length > t.length) {
            return false;
        }
        for (uint256 i = 0; i <= t.length - k.length; i++) {
            bool matchFound = true;
            for (uint256 j = 0; j < k.length; j++) {
                if (t[i + j] != k[j]) {
                    matchFound = false;
                    break;
                }
            }
            if (matchFound) {
                return true;
            }
        }
        return false;
    }

    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint256 i = 0; i < bStr.length; i++) {
            bytes1 char = bStr[i];
            if (char >= 0x41 && char <= 0x5A) {
                bLower[i] = bytes1(uint8(char) + 32);
            } else {
                bLower[i] = char;
            }
        }
        return string(bLower);
    }
}


