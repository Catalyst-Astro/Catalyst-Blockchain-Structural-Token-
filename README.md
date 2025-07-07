# Catalyst Blockchain Structural Token

This repository contains example modules for a fictional blockchain project.

## Auditor Module

The `auditor` package provides simple tools to automatically audit contract
transactions. It can detect anomalies such as high value transfers, missing
fields, or invalid signatures. When anomalies are found, a notification is
printed to the console.

### Running Tests

Run the unit tests using Python's built in `unittest` module:

```bash
python -m unittest discover -s tests
```
