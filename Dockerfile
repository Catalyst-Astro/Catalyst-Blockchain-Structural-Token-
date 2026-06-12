# syntax=docker/dockerfile:1

# Builder stage
FROM python:3.12-slim AS builder
ENV POETRY_HOME="/opt/poetry"
RUN apt-get update && apt-get install -y curl build-essential \
    && curl -sSL https://install.python-poetry.org | python -
WORKDIR /app
COPY pyproject.toml poetry.lock* ./
RUN $POETRY_HOME/bin/poetry install --no-root --only main

# Runtime stage
FROM python:3.12-slim
ENV PATH="/opt/poetry/bin:$PATH"
WORKDIR /app
COPY --from=builder /usr/local /usr/local
COPY . .
# Asegura que uvicorn apunte a la app real
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
