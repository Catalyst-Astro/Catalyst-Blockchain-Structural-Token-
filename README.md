# Catalyst-Blockchain-Structural-Token-

This repository contains smart contracts for a native token with flexible issuance mechanics. The `InflationaryRewardToken` contract implements the ERC-20 standard while adding optional inflationary minting, token burning and reward distribution capabilities.

## Contracts

- `InflationaryRewardToken.sol` – ERC-20 token with burn functionality, periodic inflation and a reward minting function controlled by an access role.

## Development

Contracts use [OpenZeppelin](https://openzeppelin.com/) libraries. Ensure you install the required dependencies and a Solidity toolchain (for example, [Hardhat](https://hardhat.org/) or [Foundry](https://book.getfoundry.sh/)) before compiling or testing the contracts.

