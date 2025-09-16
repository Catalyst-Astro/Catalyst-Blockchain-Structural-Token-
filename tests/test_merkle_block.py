import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from cbst.block import Block
from cbst.merkle import MerkleTree


def test_merkle_root():
    data = ['a', 'b', 'c', 'd']
    tree = MerkleTree(data)
    # A manual calculation
    import hashlib
    h = hashlib.sha256
    leaves = [h(x.encode()).digest() for x in data]
    level1 = [h(leaves[i] + leaves[i+1]).digest() for i in (0,2)]
    root = h(level1[0] + level1[1]).hexdigest()
    assert tree.root == root


def test_block_hash_changes_when_data_changes():
    data = ['tx1', 'tx2']
    block1 = Block(index=1, transactions=data, previous_hash='0'*64)
    original_hash = block1.hash

    # Modify transactions and expect hash to change
    block1.transactions.append('tx3')
    block1.merkle_root = MerkleTree(block1.transactions).root
    new_hash = block1.compute_hash()
    assert original_hash != new_hash
