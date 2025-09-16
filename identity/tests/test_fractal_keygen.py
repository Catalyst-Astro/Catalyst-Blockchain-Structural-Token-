import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from identity.fractal_keygen import FractalKeygen


def test_generate_rsa_and_export(tmp_path):
    fk = FractalKeygen()
    priv, pub = fk.generate_keypair('RSA', key_size=2048)
    assert fk.validate_pair(priv, pub)

    priv_file = tmp_path / 'rsa_priv.pem'
    pub_file = tmp_path / 'rsa_pub.pem'
    fk.export_private_key(priv, priv_file)
    fk.export_public_key(pub, pub_file)

    assert priv_file.exists()
    assert pub_file.exists()


def test_generate_ecc_and_export(tmp_path):
    fk = FractalKeygen()
    priv, pub = fk.generate_keypair('ECC', curve='secp256r1')
    assert fk.validate_pair(priv, pub)

    priv_file = tmp_path / 'ecc_priv.pem'
    pub_file = tmp_path / 'ecc_pub.pem'
    fk.export_private_key(priv, priv_file)
    fk.export_public_key(pub, pub_file)

    assert priv_file.exists()
    assert pub_file.exists()


