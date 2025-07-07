import io
import sys
import unittest

from auditor.audit import audit_transactions

class TestAudit(unittest.TestCase):
    def test_audit_detects_anomalies(self):
        transactions = [
            {'id': '1', 'sender': 'A', 'recipient': 'B', 'amount': 150000, 'signature': 'invalid'},
            {'id': '2', 'sender': 'A', 'recipient': 'B', 'amount': 50, 'signature': 'valid'},
            {'id': '3', 'amount': 10, 'signature': 'valid'},
        ]
        captured = io.StringIO()
        sys.stdout = captured
        results = audit_transactions(transactions, amount_threshold=100000)
        sys.stdout = sys.__stdout__

        self.assertEqual(len(results), 3)
        self.assertIn('high_value', results[0].anomalies)
        self.assertIn('invalid_transaction', results[0].anomalies)
        self.assertEqual(results[1].anomalies, [])
        self.assertIn('missing_fields', results[2].anomalies)
        # Ensure notify printed alert for anomalies
        output = captured.getvalue()
        self.assertIn('AUDIT ALERT: Transaction 1', output)
        self.assertIn('AUDIT ALERT: Transaction 3', output)

if __name__ == '__main__':
    unittest.main()
