from fractal_ledger import FractalLedger, Node


def test_add_and_validate_block():
    ledger = FractalLedger()
    ledger.add_block({"msg": "hello"})
    assert ledger.validate_chain()


def test_node_sync():
    node_a = Node(glifo="A", arquetipo="alpha")
    node_b = Node(glifo="B", arquetipo="beta")
    node_a.register_block({"data": 1})
    node_b.sync_with(node_a.ledger)
    assert node_b.ledger.validate_chain()
    assert len(node_b.ledger.chain) == len(node_a.ledger.chain)

