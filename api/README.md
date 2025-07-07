# Catalyst Blockchain API

This API provides basic RESTful endpoints to integrate wallets, nodes, and blockchain explorers in external platforms.

## Requirements

- Python 3.8+
- Flask 3.1.1 (`pip install -r requirements.txt`)

## Running the API

```bash
pip install -r requirements.txt
python app.py
```

The API will be available at `http://localhost:5000/`.

## Endpoints

- `GET /wallets` – List all wallets.
- `POST /wallets` – Create a new wallet. JSON body should include `name`.
- `GET /nodes` – List registered nodes.
- `POST /nodes` – Register a new node. JSON body should include `address`.
- `GET /explorers` – List explorers.
- `POST /explorers` – Register a new explorer. JSON body should include `url`.
