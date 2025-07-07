"""Basic Schnorr zero-knowledge proof of possession of a private key."""

from dataclasses import dataclass
from hashlib import sha256
from ecdsa import SigningKey, SECP256k1
from ecdsa.ecdsa import generator_secp256k1, int_to_string


@dataclass
class Proof:
    e: int
    s: int


def prove(secret_key: SigningKey, message: bytes) -> Proof:
    G = generator_secp256k1
    n = G.order()
    k = SigningKey.generate(curve=SECP256k1).privkey.secret_multiplier
    R = k * G
    e = int.from_bytes(sha256(int_to_string(R.x()) + message).digest(), "big") % n
    s = (k + e * secret_key.privkey.secret_multiplier) % n
    return Proof(e, s)


def verify(verifying_key, message: bytes, proof: Proof) -> bool:
    G = generator_secp256k1
    n = G.order()
    e = proof.e
    s = proof.s
    R = s * G + (-e % n) * verifying_key.pubkey.point
    e_check = int.from_bytes(sha256(int_to_string(R.x()) + message).digest(), "big") % n
    return e_check == e
