class PeerManager:
    """Manage the list of known peers for a node."""

    def __init__(self, peers=None):
        self.peers = set(peers or [])

    def add_peer(self, address: str):
        """Register a new peer address."""
        if address:
            self.peers.add(address)

    def remove_peer(self, address: str):
        self.peers.discard(address)

    def list_peers(self):
        return list(self.peers)
