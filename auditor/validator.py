def validate_transaction(tx: dict) -> bool:
    """Independently validate a transaction.

    This placeholder checks for a dummy signature field. In a real
    implementation, cryptographic verification or business rule checks
    would be performed here.
    """
    return tx.get('signature') == 'valid'
