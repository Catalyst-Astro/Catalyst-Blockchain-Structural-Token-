from __future__ import annotations
import pytest; pytest.skip("example script", allow_module_level=True)
"""Example usage of the educational blockchain modules."""

from ledger.blockchain import Blockchain
from ledger.merkle_tree import MerkleTree


def main() -> None:
    chain = Blockchain(difficulty=2)
    txs1 = ["Consagración del Nodo", "Aprobación Fractal de DAO"]
    block1 = chain.add_block(txs1)

    print("Block mined with hash:", block1.hash)
    print("Merkle root:", block1.merkle_root)
    tree = MerkleTree(txs1)
    tree.print_tree()

    proof = tree.proof(0)
    ok = MerkleTree.verify_proof(txs1[0], proof, tree.root)
    print("Proof for first transaction valid:", ok)
    print("Blockchain valid:", chain.is_valid())


if __name__ == "__main__":
    main()
