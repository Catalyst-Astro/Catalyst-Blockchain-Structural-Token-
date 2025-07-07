from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives.asymmetric.utils import Prehashed
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend


class ECDSAKeyPair:
    """ECDSA signing and verification with P-256."""

    def __init__(self, private_key: ec.EllipticCurvePrivateKey):
        self.private_key = private_key
        self.public_key = private_key.public_key()

    @staticmethod
    def generate() -> "ECDSAKeyPair":
        private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        return ECDSAKeyPair(private_key)

    def serialize_private(self) -> bytes:
        return self.private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )

    def serialize_public(self) -> bytes:
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )

    def sign(self, message: bytes) -> bytes:
        return self.private_key.sign(
            message,
            ec.ECDSA(hashes.SHA256()),
        )

    def verify(self, signature: bytes, message: bytes) -> bool:
        try:
            self.public_key.verify(signature, message, ec.ECDSA(hashes.SHA256()))
            return True
        except Exception:
            return False
