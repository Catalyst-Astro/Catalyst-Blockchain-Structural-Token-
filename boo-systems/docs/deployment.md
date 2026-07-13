# Boo Systems — Deployment Guide (#054)

## Quick Start (Docker)

```bash
cd boo-systems
docker-compose up -d
```

API available at `http://localhost:8000`
Docs at `http://localhost:8000/docs`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BOO_ENV` | `production` | Environment (dev/staging/prod) |
| `BOO_API_KEY` | `boo-prod-key` | API authentication key |
| `BOO_LOG_LEVEL` | `INFO` | Logging level |

## Manual Deploy

```bash
pip install -r requirements.txt
uvicorn src.api.routes:app --host 0.0.0.0 --port 8000
```

## Health Check

```bash
curl http://localhost:8000/health
# {"status": "ok", "version": "1.0.0"}
```

## Docker Commands

```bash
# Start
docker-compose up -d

# Logs  
docker-compose logs -f api

# Stop
docker-compose down

# Rebuild
docker-compose build --no-cache
```

## Backup

```bash
python -c "from src.backup.backup_manager import BackupManager; BackupManager().create('manual')"
```

## Restore

```bash
python -c "from src.backup.backup_manager import BackupManager; BackupManager().restore('backup_20260713_120000')"
```
