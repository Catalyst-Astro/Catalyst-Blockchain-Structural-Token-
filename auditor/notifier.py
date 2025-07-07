from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .audit import AuditResult


def notify(result: 'AuditResult') -> None:
    """Notify about audit anomalies.

    Currently this function simply prints the anomaly information. It can be
    extended to send emails or push notifications.
    """
    if result.anomalies:
        print(f"AUDIT ALERT: Transaction {result.tx_id} anomalies: {', '.join(result.anomalies)}")
