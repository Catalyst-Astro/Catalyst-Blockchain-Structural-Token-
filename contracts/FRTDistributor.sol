// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {FractalToken} from "./FractalToken.sol";
import {VestingLib} from "./libraries/VestingLib.sol";

/// @title FRTDistributor
/// @notice Distributes Fractal Token (FRT) using time based vesting schedules and validator rewards.
/// @dev Designed following conservative distribution practices compatible with FINMA guidelines.
contract FRTDistributor is Ownable, ReentrancyGuard {
    using VestingLib for VestingLib.Schedule;

    /// @dev Information for a beneficiary's vesting schedule.
    struct Vesting {
        VestingLib.Schedule schedule;
        uint256 claimed;
    }

    FractalToken public immutable token;
    address public treasury;

    mapping(address => Vesting) public vestings;
    mapping(address => bool) public validatorNodes;

    event VestingCreated(address indexed beneficiary, uint256 amount, uint64 start, uint64 cliff, uint64 duration);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event RewardDistributed(address indexed node, uint256 amount);

    constructor(
        FractalToken _token,
        address _treasury,
        address founder,
        uint256 founderAmount,
        address daoReserve,
        uint256 daoAmount,
        address mainTreasury,
        uint256 treasuryAmount,
        address ecosystem,
        uint256 ecosystemAmount,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        address initialOwner
    ) Ownable(initialOwner) {
        require(address(_token) != address(0) && _treasury != address(0), "invalid");
        token = _token;
        treasury = _treasury;

        _createVesting(founder, founderAmount, start, cliff, duration);
        _createVesting(daoReserve, daoAmount, start, cliff, duration);
        _createVesting(mainTreasury, treasuryAmount, start, cliff, duration);
        _createVesting(ecosystem, ecosystemAmount, start, cliff, duration);
    }

    /// @notice Update the treasury address used to source token transfers.
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "invalid");
        treasury = _treasury;
    }

    /// @notice Register a validator node to receive rewards.
    function addValidator(address node) external onlyOwner {
        require(node != address(0), "invalid");
        validatorNodes[node] = true;
    }

    /// @notice Remove a validator node from the reward list.
    function removeValidator(address node) external onlyOwner {
        validatorNodes[node] = false;
    }

    /// @notice Distribute reward tokens to an authorized validator node.
    function distributeReward(address node, uint256 amount) external onlyOwner nonReentrant {
        require(validatorNodes[node], "not validator");
        _transferToken(node, amount);
        emit RewardDistributed(node, amount);
    }

    /// @notice Claim vested tokens. Beneficiaries call this to receive due FRT.
    function claim() external nonReentrant {
        Vesting storage v = vestings[msg.sender];
        require(v.schedule.total > 0, "no vesting");

        uint256 vested = v.schedule.vestedAmount(uint64(block.timestamp));
        uint256 releasable = vested - v.claimed;
        require(releasable > 0, "nothing to claim");

        v.claimed = vested;
        _transferToken(msg.sender, releasable);
        emit TokensClaimed(msg.sender, releasable);
    }

    /// @notice View total vested amount for a beneficiary at the current time.
    function getVestedAmount(address account) external view returns (uint256) {
        Vesting storage v = vestings[account];
        return v.schedule.vestedAmount(uint64(block.timestamp));
    }

    /// @notice View claimable amount for a beneficiary at the current time.
    function getClaimableAmount(address account) external view returns (uint256) {
        Vesting storage v = vestings[account];
        uint256 vested = v.schedule.vestedAmount(uint64(block.timestamp));
        return vested - v.claimed;
    }

    /// @dev Internal function to perform token transfer from treasury.
    function _transferToken(address to, uint256 amount) internal {
        require(token.transferFrom(treasury, to, amount), "transfer failed");
    }

    /// @dev Create a vesting schedule for a beneficiary.
    function _createVesting(address beneficiary, uint256 amount, uint64 start, uint64 cliff, uint64 duration) internal {
        require(beneficiary != address(0), "invalid beneficiary");
        require(vestings[beneficiary].schedule.total == 0, "exists");

        vestings[beneficiary] = Vesting({
            schedule: VestingLib.Schedule({total: amount, start: start, cliff: cliff, duration: duration}),
            claimed: 0
        });

        emit VestingCreated(beneficiary, amount, start, cliff, duration);
    }
}
