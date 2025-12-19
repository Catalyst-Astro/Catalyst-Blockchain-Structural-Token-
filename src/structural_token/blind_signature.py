import math
import secrets

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa


class RSABlindSigner:
    """Implements RSA blind signing."""

    def __init__(self, key: rsa.RSAPrivateKey | None = None):
        self.key = key or rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend(),
        )

    @property
    def public_key(self) -> rsa.RSAPublicKey:
        return self.key.public_key()

    def sign(self, blinded_msg: int) -> int:
        numbers = self.key.private_numbers()
        return pow(blinded_msg, numbers.d, numbers.public_numbers.n)


class RSABlindSignatureProtocol:
    """Handles blinding and unblinding for RSA blind signatures."""

    def __init__(self, pubkey: rsa.RSAPublicKey):
        self.pubkey = pubkey
        numbers = pubkey.public_numbers()
        self.n = numbers.n
        self.e = numbers.e

    def ensure_coprime(self, r: int) -> None:
        if math.gcd(r, self.n) != 1:
            raise ValueError("Blinding factor must be coprime with modulus")

    def random_blinding_factor(self) -> int:
        while True:
            r = secrets.randbelow(self.n)
            if r > 1 and math.gcd(r, self.n) == 1:
                return r

    def blind(self, message: int, r: int) -> int:
        self.ensure_coprime(r)
        return (pow(r, self.e, self.n) * message) % self.n

    def unblind(self, signed: int, r: int) -> int:
        self.ensure_coprime(r)
        r_inv = pow(r, -1, self.n)
        return (signed * r_inv) % self.n

    def verify(self, message: int, signature: int) -> bool:
        return pow(signature, self.e, self.n) == message % self.n
