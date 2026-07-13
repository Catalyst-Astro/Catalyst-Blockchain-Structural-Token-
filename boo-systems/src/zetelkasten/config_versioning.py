#!/usr/bin/env python3
"""
Config Versioning — Track & Rollback Configurations (#043)
═══════════════════════════════════════════════════════════
BELL 13450.50 | Versioned YAML configs with diff and rollback.
"""

import os, json, hashlib, shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional


class ConfigVersioner:
    """Version-controlled configuration management."""

    def __init__(self, config_dir: str = None):
        if config_dir is None:
            config_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "configs")
        self.config_dir = Path(config_dir)
        self.versions_dir = self.config_dir / ".versions"
        self.versions_dir.mkdir(parents=True, exist_ok=True)
        self.manifest_path = self.versions_dir / "manifest.json"

    def save_version(self, name: str, data: Dict) -> str:
        """Save a new config version."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        version_id = f"v_{timestamp}_{name}"
        filepath = self.versions_dir / f"{version_id}.json"
        data["_version"] = version_id
        data["_timestamp"] = datetime.now(timezone.utc).isoformat()
        data["_hash"] = hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()[:16]
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        self._update_manifest(version_id, name)
        return version_id

    def load_version(self, version_id: str = "latest") -> Optional[Dict]:
        """Load a specific version or the latest."""
        if version_id == "latest":
            versions = self.list_versions()
            if not versions:
                return None
            version_id = versions[-1]["id"]
        filepath = self.versions_dir / f"{version_id}.json"
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def list_versions(self) -> List[Dict]:
        """List all saved versions."""
        if self.manifest_path.exists():
            with open(self.manifest_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def diff(self, v1_id: str, v2_id: str) -> Dict:
        """Find differences between two versions."""
        v1 = self.load_version(v1_id)
        v2 = self.load_version(v2_id)
        if not v1 or not v2:
            return {"error": "Version not found"}

        all_keys = set(v1.keys()) | set(v2.keys())
        diff = {}
        for key in all_keys:
            if key.startswith("_"):
                continue
            val1, val2 = v1.get(key), v2.get(key)
            if val1 != val2:
                diff[key] = {"from": val1, "to": val2}
        return diff

    def rollback(self, version_id: str) -> Optional[str]:
        """Rollback to a previous version. Saves current as backup first."""
        current = self.load_version("latest")
        if current:
            self.save_version("auto_backup", current)
        target = self.load_version(version_id)
        if not target:
            return None
        new_id = self.save_version(f"rollback_to_{version_id}", target)
        return new_id

    def _update_manifest(self, version_id: str, name: str):
        manifest = self.list_versions()
        manifest.append({
            "id": version_id, "name": name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        with open(self.manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, default=str)
