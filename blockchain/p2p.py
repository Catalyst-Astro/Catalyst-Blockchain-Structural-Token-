import socket
import threading
import json
from typing import List, Tuple

class Node:
    """Basic P2P node using TCP sockets."""

    def __init__(self, host: str, port: int, peers: List[Tuple[str, int]] | None = None):
        self.host = host
        self.port = port
        self.peers = peers or []
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server.bind((self.host, self.port))
        self.server.listen()
        self.running = False
        self.lock = threading.Lock()
        self.connections: List[socket.socket] = []

    def start(self):
        self.running = True
        threading.Thread(target=self._accept_loop, daemon=True).start()
        for peer in self.peers:
            self.connect_to_peer(peer)

    def stop(self):
        self.running = False
        with self.lock:
            for conn in self.connections:
                try:
                    conn.close()
                except OSError:
                    pass
            self.connections.clear()
        self.server.close()

    def connect_to_peer(self, peer: Tuple[str, int]):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect(peer)
            with self.lock:
                self.connections.append(sock)
            threading.Thread(target=self._listen_to, args=(sock,), daemon=True).start()
        except OSError:
            pass

    def broadcast(self, message: dict):
        data = json.dumps(message).encode()
        with self.lock:
            for conn in self.connections:
                try:
                    conn.sendall(data + b"\n")
                except OSError:
                    pass

    def _accept_loop(self):
        while self.running:
            try:
                conn, _ = self.server.accept()
                with self.lock:
                    self.connections.append(conn)
                threading.Thread(target=self._listen_to, args=(conn,), daemon=True).start()
            except OSError:
                break

    def _listen_to(self, conn: socket.socket):
        buf = b""
        try:
            while self.running:
                chunk = conn.recv(4096)
                if not chunk:
                    break
                buf += chunk
                while b"\n" in buf:
                    line, buf = buf.split(b"\n", 1)
                    try:
                        msg = json.loads(line.decode())
                        self.on_message(msg, conn)
                    except json.JSONDecodeError:
                        pass
        finally:
            with self.lock:
                if conn in self.connections:
                    self.connections.remove(conn)
            conn.close()

    def on_message(self, message: dict, conn: socket.socket):
        """Override in subclasses to handle messages."""
        pass
