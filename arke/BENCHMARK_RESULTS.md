# Benchmark Results

Steps to reproduce:

1. `poetry install`
2. `poetry run locust -f benchmarks/locustfile.py --host http://localhost:8000 --headless -u 5000 -r 5000 -t 1m --html benchmarks/report.html`

HTML report will be stored in `benchmarks/report.html`.
