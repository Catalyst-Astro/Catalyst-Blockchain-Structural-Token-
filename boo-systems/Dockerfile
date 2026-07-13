# Boo Systems — Base Docker Image (#052)
# Multi-stage build for production
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS runtime
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY . .

ENV PYTHONUNBUFFERED=1
ENV BOO_ENV=production
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "src.api.routes:app", "--host", "0.0.0.0", "--port", "8000"]
