# Benchmarks

Use [Locust](https://locust.io/) to simulate high load.

```bash
poetry run locust -f benchmarks/locustfile.py \
    --host http://localhost:8000 \
    --headless -u 5000 -r 5000 -t 1m \
    --html benchmarks/report.html
```

This fires 5k requests/s to `/api/v1/telemetry/ingest` and 2k requests/s to `/api/v1/decision` via task weighting.
