# Modular Scaling Examples

This repository demonstrates a simple modular architecture inspired by *Mastering Ethereum*. It includes examples for:

- **Sidechains:** `SidechainBridge.sol` locks tokens on the main chain so an equivalent amount can be minted on a sidechain.
- **Rollups:** `RollupAggregator.sol` records batch roots for an optimistic or ZK rollup.

Both contracts are intentionally minimal to highlight how separate components can evolve independently while interacting through defined interfaces.

Compile the contracts with Solidity `>=0.8.19` and integrate them in your preferred framework.
