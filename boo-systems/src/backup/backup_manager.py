#!/usr/bin/env python3
"""
Backup Manager — Auto-backup & Recovery (#044)
═══════════════════════════════════════════════
BELL 13450.50 | Compresses and manages backups of data/ and configs/.
"""

import os, json, shutil, hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional


class BackupManager:
    """Automatic backup and recovery system."""

    def __init__(self, project_root: str = None):
        if project_root is None:
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.root = Path(project_root)
        self.backup_dir = self.root / "data" / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.manifest_path = self.backup_dir / "backups.json"

    def create(self, label: str = "") -> str:
        """Create a new backup (zip of data/ and configs/)."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{timestamp}"
        if label:
            backup_name += f"_{label}"
        backup_path = self.backup_dir / backup_name
        backup_path.mkdir(parents=True, exist_ok=True)

        # Copy data/
        data_src = self.root / "data"
        if data_src.exists():
            data_dst = backup_path / "data"
            shutil.copytree(data_src, data_dst, dirs_exist_ok=True, ignore=shutil.ignore_patterns("backups", "__pycache__", ".versions"))

        # Copy configs/
        configs_src = self.root / "configs"
        if configs_src.exists():
            configs_dst = backup_path / "configs"
            shutil.copytree(configs_src, configs_dst, dirs_exist_ok=True, ignore=shutil.ignore_patterns(".versions", "__pycache__"))

        # Manifest
        manifest = {
            "name": backup_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "label": label,
            "hash": self._hash_backup(backup_path),
        }
        with open(backup_path / "manifest.json", "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, default=str)

        # Zip
        zip_path = str(backup_path) + ".zip"
        shutil.make_archive(str(backup_path), "zip", str(backup_path))

        # Clean uncompressed
        shutil.rmtree(backup_path)

        self._record(manifest)
        return zip_path

    def list(self) -> List[Dict]:
        """List all available backups."""
        if self.manifest_path.exists():
            with open(self.manifest_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def restore(self, backup_name: str) -> Dict:
        """Restore from a backup."""
        zip_path = self.backup_dir / f"{backup_name}.zip"
        if not zip_path.exists():
            return {"ok": False, "error": f"Backup {backup_name} not found"}

        # Extract
        extract_path = self.backup_dir / f"_restore_{backup_name}"
        shutil.unpack_archive(str(zip_path), str(extract_path), "zip")

        # Restore data/
        data_restore = extract_path / "data"
        if data_restore.exists():
            data_dst = self.root / "data"
            if data_dst.exists():
                shutil.rmtree(data_dst)
            shutil.copytree(data_restore, data_dst)

        # Restore configs/
        configs_restore = extract_path / "configs"
        if configs_restore.exists():
            configs_dst = self.root / "configs"
            if configs_dst.exists():
                shutil.rmtree(configs_dst)
            shutil.copytree(configs_restore, configs_dst)

        shutil.rmtree(extract_path)
        return {"ok": True, "restored": backup_name}

    def cleanup(self, max_age_days: int = 30):
        """Remove backups older than max_age_days."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
        backups = self.list()
        removed = 0
        for b in backups:
            try:
                ts = datetime.fromisoformat(b["timestamp"])
                if ts < cutoff:
                    zip_path = self.backup_dir / f"{b['name']}.zip"
                    if zip_path.exists():
                        os.remove(zip_path)
                        removed += 1
            except Exception:
                continue

        # Update manifest
        remaining = [b for b in backups if (self.backup_dir / f"{b['name']}.zip").exists()]
        with open(self.manifest_path, "w", encoding="utf-8") as f:
            json.dump(remaining, f, indent=2, default=str)
        return {"removed": removed, "remaining": len(remaining)}

    def _record(self, manifest: Dict):
        records = self.list()
        records.append(manifest)
        with open(self.manifest_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, default=str)

    def _hash_backup(self, path: Path) -> str:
        """Compute hash of backup contents."""
        hasher = hashlib.sha256()
        for root, dirs, files in os.walk(path):
            for fname in sorted(files):
                fpath = os.path.join(root, fname)
                with open(fpath, "rb") as f:
                    hasher.update(f.read())
        return hasher.hexdigest()[:16]
