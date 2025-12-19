import sys
from auditor.audit import audit_transactions
from auditor.notifier import notify

def main():
    # Puedes cargar transacciones reales desde un archivo o base de datos aquí.
    # Ejemplo de transacciones simuladas:
    transactions = [
        {'id': '1', 'sender': 'A', 'recipient': 'B', 'amount': 150000, 'signature': 'invalid'},
        {'id': '2', 'sender': 'A', 'recipient': 'B', 'amount': 50, 'signature': 'valid'},
        {'id': '3', 'amount': 10, 'signature': 'valid'},
    ]

    results = audit_transactions(transactions, amount_threshold=100000)

    any_anomalies = False
    for result in results:
        notify(result)
        if result.anomalies:
            any_anomalies = True

    if any_anomalies:
        sys.exit(2)
    sys.exit(0)

if __name__ == '__main__':
    main()