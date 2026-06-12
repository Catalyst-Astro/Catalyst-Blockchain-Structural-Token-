// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title TokenVesting
/// @notice On-chain vesting enforcement for CAT token distribution.
///         Each beneficiary gets a schedule: cliff + linear vesting.
///         Admin can create schedules, revoke unvested tokens, and recover dust.
///
///         Distribution (matching TOKENOMICS.md):
///         ┌─────────────────────┬──────────┬──────────┬────────────┐
///         │ Allocation          │ %        │ Amount   │ Vesting     │
///         ├─────────────────────┼──────────┼──────────┼────────────┤
///         │ Platform Treasury   │ 30%      │ 300M CAT │ 4 years     │
///         │ Community/Ecosystem │ 25%      │ 250M CAT │ 3 years     │
///         │ Team & Advisors     │ 15%      │ 150M CAT │ 4yr, 1yr cl │
///         │ Private Sale        │ 15%      │ 150M CAT │ 1 year      │
///         │ Liquidity (DEX)     │ 10%      │ 100M CAT │ Unlocked    │
///         │ Airdrop             │  5%      │  50M CAT │ 6 months    │
///         └─────────────────────┴──────────┴──────────┴────────────┘
contract TokenVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    struct Schedule {
        uint256 totalAmount;       // total tokens allocated
        uint256 claimedAmount;     // tokens already withdrawn
        uint256 startTime;         // when vesting begins
        uint256 cliffDuration;     // seconds before any tokens unlock
        uint256 vestingDuration;   // seconds for full linear vest (after cliff)
        bool revocable;            // can admin revoke unvested tokens?
        bool revoked;              // has this schedule been revoked?
    }

    mapping(address => Schedule) public schedules;
    address[] public beneficiaries;

    event ScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event ScheduleRevoked(address indexed beneficiary, uint256 unvestedReturned);

    constructor(address token_) {
        require(token_ != address(0), "token required");
        token = IERC20(token_);
    }

    /// @notice Create a vesting schedule for a beneficiary.
    ///         The contract must already hold the tokens.
    function createSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable_
    ) external onlyOwner {
        require(beneficiary != address(0), "beneficiary required");
        require(totalAmount > 0, "amount required");
        require(schedules[beneficiary].totalAmount == 0, "schedule exists");
        require(token.balanceOf(address(this)) >= totalAmount, "insufficient contract balance");

        schedules[beneficiary] = Schedule({
            totalAmount: totalAmount,
            claimedAmount: 0,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            revocable: revocable_,
            revoked: false
        });
        beneficiaries.push(beneficiary);

        emit ScheduleCreated(beneficiary, totalAmount, startTime, cliffDuration, vestingDuration);
    }

    /// @notice Batch create schedules (gas efficient for initial distribution).
    function batchCreateSchedules(
        address[] calldata beneficiaries_,
        uint256[] calldata amounts,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable_
    ) external onlyOwner {
        require(beneficiaries_.length == amounts.length, "length mismatch");
        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        require(token.balanceOf(address(this)) >= total, "insufficient contract balance");

        for (uint256 i = 0; i < beneficiaries_.length; i++) {
            address beneficiary = beneficiaries_[i];
            require(beneficiary != address(0), "zero address");
            require(schedules[beneficiary].totalAmount == 0, "schedule exists");

            schedules[beneficiary] = Schedule({
                totalAmount: amounts[i],
                claimedAmount: 0,
                startTime: startTime,
                cliffDuration: cliffDuration,
                vestingDuration: vestingDuration,
                revocable: revocable_,
                revoked: false
            });
            beneficiaries.push(beneficiary);

            emit ScheduleCreated(beneficiary, amounts[i], startTime, cliffDuration, vestingDuration);
        }
    }

    /// @notice Calculate the currently vested amount for a beneficiary.
    function vestedAmount(address beneficiary) public view returns (uint256) {
        Schedule storage s = schedules[beneficiary];
        if (s.totalAmount == 0 || s.revoked) return 0;

        uint256 cliffEnd = s.startTime + s.cliffDuration;
        uint256 vestingEnd = cliffEnd + s.vestingDuration;

        if (block.timestamp < cliffEnd) {
            return 0; // still in cliff
        }
        if (block.timestamp >= vestingEnd || s.vestingDuration == 0) {
            return s.totalAmount; // fully vested
        }
        // Linear: proportion of vestingDuration elapsed since cliff
        return (s.totalAmount * (block.timestamp - cliffEnd)) / s.vestingDuration;
    }

    /// @notice Claim vested tokens. Anyone can call this (tokens go to beneficiary).
    /// @notice Claim vested tokens. Anyone can call (tokens go to beneficiary).
    function claim(address beneficiary) public nonReentrant {
        uint256 vested = vestedAmount(beneficiary);
        Schedule storage s = schedules[beneficiary];
        require(vested > s.claimedAmount, "nothing to claim");
        uint256 toClaim = vested - s.claimedAmount;
        s.claimedAmount = vested;
        token.safeTransfer(beneficiary, toClaim);
        emit TokensClaimed(beneficiary, toClaim);
    }

    /// @notice Claim vested tokens for self.
    function claimForSelf() external nonReentrant {
        claim(msg.sender);
    }

    /// @notice Admin: revoke a revocable schedule. Unvested tokens stay in contract.
    function revoke(address beneficiary) external onlyOwner {
        Schedule storage s = schedules[beneficiary];
        require(s.totalAmount > 0, "no schedule");
        require(s.revocable, "not revocable");
        require(!s.revoked, "already revoked");

        // Allow beneficiary to claim what's already vested before revoking
        uint256 vested = vestedAmount(beneficiary);
        if (vested > s.claimedAmount) {
            uint256 toClaim = vested - s.claimedAmount;
            s.claimedAmount = vested;
            token.safeTransfer(beneficiary, toClaim);
            emit TokensClaimed(beneficiary, toClaim);
        }

        uint256 unvested = s.totalAmount - s.claimedAmount;
        s.revoked = true;
        emit ScheduleRevoked(beneficiary, unvested);
        // unvested tokens remain in contract; owner can recover via recoverUnvested()
    }

    /// @notice Admin: recover unvested tokens from revoked schedules back to owner.
    function recoverUnvested() external onlyOwner {
        uint256 totalUnvested;
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address b = beneficiaries[i];
            Schedule storage s = schedules[b];
            if (s.revoked) {
                totalUnvested += (s.totalAmount - s.claimedAmount);
                s.totalAmount = s.claimedAmount; // mark as fully settled
            }
        }
        require(totalUnvested > 0, "nothing to recover");
        token.safeTransfer(owner(), totalUnvested);
    }

    /// @notice View: how many beneficiaries are registered.
    function beneficiaryCount() external view returns (uint256) {
        return beneficiaries.length;
    }
}
