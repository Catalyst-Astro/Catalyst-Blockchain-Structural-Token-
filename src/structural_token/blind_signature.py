from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives import constant_time
from cryptography.hazmat.backends import default_backend

class RSABlindSigner:
    """Implements RSA blind signing."""
    def __init__(self, key: rsa.RSAPrivateKey | None = None):
        self.key = key or rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())

    @property
    def public_key(self) -> rsa.RSAPublicKey:
        return self.key.public_key()

    def sign(self, blinded_msg: int) -> int:
        d = self.key.private_numbers().d
        n = self.key.private_numbers().public_numbers.n
        return pow(blinded_msg, d, n)

class RSABlindSignatureProtocol:
    """Handles blinding and unblinding for RSA blind signatures."""
    def __init__(self, pubkey: rsa.RSAPublicKey):
        self.pubkey = pubkey
        self.n = pubkey.public_numbers().n
        self.e = pubkey.public_numbers().e

    def blind(self, message: int, r: int) -> int:
        return (pow(r, self.e, self.n) * message) % self.n

    def unblind(self, signed: int, r: int) -> int:
        r_inv = pow(r, -1, self.n)
        return (signed * r_inv) % self.n

    def verify(self, message: int, signature: int) -> bool:
        return pow(signature, self.e, self.n) == message % self.n
