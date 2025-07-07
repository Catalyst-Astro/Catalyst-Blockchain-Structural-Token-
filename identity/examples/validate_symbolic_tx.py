"""Ejemplo simbólico de validación de transacciones con identidad."""

from identity.digital_signature import ECCIdentity
from identity.multisig_wallet import Transaction
from identity.identity_manager import IdentityManager


def main():
    participants = [ECCIdentity.generate() for _ in range(3)]
    manager = IdentityManager(participants)

    msg = b"identidad"
    proofs = [manager.create_proof(p, msg) for p in participants]
    assert all(manager.verify_proof(p, msg, pr) for p, pr in zip(participants, proofs))

    tx = Transaction(sender="Alice", recipient="Bob", amount=5)
    approved = manager.sign_and_validate(tx, participants[:2])
    if approved:
        print("Transacción aprobada")
    else:
        print("Transacción rechazada")


if __name__ == "__main__":
    main()
