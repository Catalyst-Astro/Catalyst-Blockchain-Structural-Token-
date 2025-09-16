// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ContabilidadFractal
 * @dev Simple ledger that tracks tokenized flows by project and wallet.
 */
contract ContabilidadFractal {
    struct Balance {
        uint256 debit;
        uint256 credit;
    }

    mapping(uint256 => mapping(address => Balance)) private balances;

    event EntryRecorded(uint256 indexed projectId, address indexed wallet, string category, int256 amount);

    /**
     * @dev Record an accounting entry for a project wallet.
     *      Positive amount increases debit, negative increases credit.
     */
    function recordEntry(uint256 projectId, address wallet, string calldata category, int256 amount) external {
        Balance storage b = balances[projectId][wallet];
        if (amount > 0) {
            b.debit += uint256(amount);
        } else {
            b.credit += uint256(-amount);
        }
        emit EntryRecorded(projectId, wallet, category, amount);
    }

    function getBalance(uint256 projectId, address wallet) external view returns (uint256 debit, uint256 credit) {
        Balance storage b = balances[projectId][wallet];
        return (b.debit, b.credit);
    }
}
