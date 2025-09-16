from catalyst.crypto.secure_keys import generate_keypair, validate_keypair


def test_generate_rsa():
    kp = generate_keypair("rsa", key_size=1024)
    assert validate_keypair(kp)


def test_generate_ecc():
    kp = generate_keypair("ecc", curve="secp256r1")
    assert validate_keypair(kp)
