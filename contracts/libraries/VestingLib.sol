// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library VestingLib {
    struct Schedule {
        uint256 total;
        uint64 start;
        uint64 cliff;
        uint64 duration;
    }

    function vestedAmount(Schedule memory s, uint64 currentTime) internal pure returns (uint256) {
        if (currentTime < s.start + s.cliff || s.total == 0) {
            return 0;
        }
        if (currentTime >= s.start + s.duration) {
            return s.total;
        }
        uint256 elapsed = currentTime - s.start;
        return (s.total * elapsed) / s.duration;
    }
}
