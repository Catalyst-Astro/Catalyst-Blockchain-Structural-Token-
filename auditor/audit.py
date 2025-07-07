import json
from dataclasses import dataclass
from typing import List, Dict

from .validator import validate_transaction
from .notifier import notify

@dataclass
class AuditResult:
    tx_id: str
    valid: bool
    anomalies: List[str]

def audit_transactions(transactions: List[Dict], amount_threshold: float = 100000) -> List[AuditResult]:
    """Audit a list of transactions.

    Args:
        transactions: List of transaction dictionaries.
        amount_threshold: Value above which a transaction is considered high value.

    Returns:
        List of AuditResult objects.
    """
    results: List[AuditResult] = []
    for tx in transactions:
        tx_id = tx.get('id', 'unknown')
        valid = validate_transaction(tx)
        anomalies: List[str] = []
        if not valid:
            anomalies.append('invalid_transaction')
        if tx.get('amount', 0) > amount_threshold:
            anomalies.append('high_value')
        if not tx.get('sender') or not tx.get('recipient'):
            anomalies.append('missing_fields')
        result = AuditResult(tx_id=tx_id, valid=valid, anomalies=anomalies)
        if anomalies:
            notify(result)
        results.append(result)
    return results
