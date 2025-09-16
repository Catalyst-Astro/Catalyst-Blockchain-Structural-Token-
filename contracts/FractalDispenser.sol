// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IFRT is IERC20 {
    function mint(address to, uint256 amount) external;
}

/**
 * @title FractalDispenser
 * @notice Contract to dispense FRT tokens for approved distributors.
 */
contract FractalDispenser is Ownable {
    IFRT public immutable frt;
    mapping(address => bool) public distributors;

    event DistributorUpdated(address indexed distributor, bool authorized);
    event Dispensed(
        address indexed to,
        uint256 amount,
        string purpose,
        string arquetipo,
        string ciclo
    );

    modifier onlyDistributor() {
        require(distributors[msg.sender], "not authorized");
        _;
    }

    constructor(IFRT token) Ownable(msg.sender) {
        frt = token;
    }

    function setDistributor(address distributor, bool authorized) external onlyOwner {
        distributors[distributor] = authorized;
        emit DistributorUpdated(distributor, authorized);
    }

    function dispense(
        address to,
        uint256 amount,
        string memory purpose,
        string memory arquetipo,
        string memory ciclo
    ) external onlyDistributor {
        frt.mint(to, amount);
        emit Dispensed(to, amount, purpose, arquetipo, ciclo);
    }
}

