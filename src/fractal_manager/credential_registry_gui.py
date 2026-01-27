"""Tkinter credential registry with crypto antivirus checks."""
from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import hmac
import json
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import uuid

from cryptography.fernet import Fernet, InvalidToken

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "artifacts" / "credential_registry"
DATA_PATH = DATA_DIR / "records.enc"
KEY_PATH = DATA_DIR / "registry.key"
SIGNATURES_PATH = ROOT_DIR / "security" / "crypto_antivirus_signatures.json"

PAYLOAD_KEYS = (
    "id",
    "issuer",
    "subject",
    "credential_type",
    "details",
    "attachment",
    "created_at",
    "scan",
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _canonical_json(data: dict) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


@dataclass
class ScanReport:
    status: str
    issues: list[str]
    text_hashes: dict[str, str]
    file_hash: str | None
    combined_hash: str


class CryptoAntivirus:
    def __init__(self, signature_path: Path) -> None:
        self.signature_path = signature_path
        self.signatures = self._load_signatures()

    def _load_signatures(self) -> dict:
        if not self.signature_path.exists():
            return {"text_hashes": [], "file_hashes": []}
        raw = json.loads(self.signature_path.read_text(encoding="utf-)
        return {
            "text_hashes": list(raw.get("text_hashes", [])),
            "file_hashes": list(raw.get("file_hashes", [])),
        }

    @staticmethod
    def _hash_bytes(payload: bytes) -> str:
        return hashlib.sha256(payload).hexdigest()

    def _hash_text(self, payload: str) -> str:
        return self._hash_bytes(payload.encode("utf-8"))

    def _hash_file(self, path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(8192), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def scan(self, fields: dict[str, str], file_path: Path | None) -> ScanReport:
        issues: list[str] = []
        text_hashes: dict[str, str] = {}
        combined = []
        for key, value in fields.items():
            if not value:
                continue
            digest = self._hash_text(value)
            text_hashes[key] = digest
            combined.append(value)
            if digest in self.signatures["text_hashes"]:
                issues.append(f"text field blocked: {key}")

        combined_hash = self._hash_text("\n".join(combined))

        file_hash = None
        if file_path:
            if not file_path.exists() or not file_path.is_file():
                issues.append("attachment missing")
            else:
                file_hash = self._hash_file(file_path)
                if file_hash in self.signatures["file_hashes"]:
                    issues.append("attachment hash blocked")

        status = "clean" if not issues else "blocked"
        return ScanReport(
            status=status,
            issues=issues,
            text_hashes=text_hashes,
            file_hash=file_hash,
            combined_hash=combined_hash,
        )


class CredentialStore:
    def __init__(self, data_path: Path, key_path: Path) -> None:
        self.data_path = data_path
        self.key_path = key_path
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        key = self._load_or_create_key()
        self.fernet = Fernet(key)
        self.hmac_key = self._derive_hmac_key(key)

    def _load_or_create_key(self) -> bytes:
        if self.key_path.exists():
            return self.key_path.read_bytes().strip()
        key = Fernet.generate_key()
        self.key_path.write_bytes(key)
        return key

    def _derive_hmac_key(self, key: bytes) -> bytes:
        raw = base64.urlsafe_b64decode(key)
        return hashlib.sha256(raw + b"credential-registry").digest()

    def _sign_payload(self, payload_hash: str) -> str:
        return hmac.new(self.hmac_key, payload_hash.encode("ascii"), hashlib.sha256).hexdigest()

    def _payload_hash(self, payload: dict) -> str:
        return hashlib.sha256(_canonical_json(payload).encode("ascii")).hexdigest()

    def _build_payload(self, record: dict) -> dict:
        return {key: record.get(key) for key in PAYLOAD_KEYS}

    def _verify_record(self, record: dict) -> bool:
        payload = self._build_payload(record)
        payload_hash = self._payload_hash(payload)
        if payload_hash != record.get("payload_hash"):
            return False
        expected = self._sign_payload(payload_hash)
        return hmac.compare_digest(expected, record.get("signature", ""))

    def append_record(self, record: dict) -> None:
        payload = self._build_payload(record)
        payload_hash = self._payload_hash(payload)
        record["payload_hash"] = payload_hash
        record["signature"] = self._sign_payload(payload_hash)
        token = self.fernet.encrypt(json.dumps(record, ensure_ascii=True).encode("ascii"))
        with self.data_path.open("a", encoding="utf-8") as handle:
            handle.write(token.decode("ascii") + "\n")

    def load_records(self) -> list[dict]:
        if not self.data_path.exists():
            return []
        records: list[dict] = []
        for line in self.data_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                payload = self.fernet.decrypt(line.strip().encode("ascii"))
                record = json.loads(payload.decode("ascii"))
                record["_signature_valid"] = self._verify_record(record)
            except (InvalidToken, json.JSONDecodeError):
                record = {"_error": "decrypt_failed"}
            records.append(record)
        return records


class CredentialRegistryApp(ttk.Frame):
    def __init__(self, master: tk.Tk | None = None) -> None:
        super().__init__(master)
        self.master.title("Credential Registry")
        self.pack(fill="both", expand=True)
        self.store = CredentialStore(DATA_PATH, KEY_PATH)
        self.antivirus = CryptoAntivirus(SIGNATURES_PATH)
        self.records: list[dict] = []
        self.record_index_by_iid: dict[str, int] = {}
        self._build_ui()
        self._load_records()

    def _build_ui(self) -> None:
        pane = ttk.Panedwindow(self, orient="horizontal")
        pane.pack(fill="both", expand=True, padx=12, pady=12)

        form_frame = ttk.Frame(pane)
        list_frame = ttk.Frame(pane)
        pane.add(form_frame, weight=3)
        pane.add(list_frame, weight=2)

        form_frame.columnconfigure(1, weight=1)

        ttk.Label(form_frame, text="Issuer").grid(row=0, column=0, sticky="w")
        self.issuer_entry = ttk.Entry(form_frame)
        self.issuer_entry.grid(row=0, column=1, sticky="ew", pady=4)

        ttk.Label(form_frame, text="Subject").grid(row=1, column=0, sticky="w")
        self.subject_entry = ttk.Entry(form_frame)
        self.subject_entry.grid(row=1, column=1, sticky="ew", pady=4)

        ttk.Label(form_frame, text="Credential Type").grid(row=2, column=0, sticky="w")
        self.type_entry = ttk.Entry(form_frame)
        self.type_entry.grid(row=2, column=1, sticky="ew", pady=4)

        ttk.Label(form_frame, text="Details").grid(row=3, column=0, sticky="nw")
        self.details_text = tk.Text(form_frame, height=6, wrap="word")
        self.details_text.grid(row=3, column=1, sticky="ew", pady=4)

        ttk.Label(form_frame, text="Attachment").grid(row=4, column=0, sticky="w")
        self.file_path_var = tk.StringVar()
        file_row = ttk.Frame(form_frame)
        file_row.grid(row=4, column=1, sticky="ew", pady=4)
        file_row.columnconfigure(0, weight=1)
        self.file_entry = ttk.Entry(file_row, textvariable=self.file_path_var)
        self.file_entry.grid(row=0, column=0, sticky="ew")
        ttk.Button(file_row, text="Browse", command=self._browse_file).grid(row=0, column=1, padx=6)

        button_row = ttk.Frame(form_frame)
        button_row.grid(row=5, column=1, sticky="w", pady=8)
        ttk.Button(button_row, text="Scan", command=self._scan).grid(row=0, column=0, padx=(0, 6))
        ttk.Button(button_row, text="Save", command=self._save).grid(row=0, column=1, padx=(0, 6))
        ttk.Button(button_row, text="Clear", command=self._clear).grid(row=0, column=2)

        self.status_var = tk.StringVar(value="Ready.")
        ttk.Label(form_frame, textvariable=self.status_var, wraplength=420).grid(
            row=6, column=0, columnspan=2, sticky="w", pady=(6, 0)
        )

        ttk.Label(list_frame, text="Records").pack(anchor="w")
        table_frame = ttk.Frame(list_frame)
        table_frame.pack(fill="both", expand=True)

        columns = ("id", "issuer", "subject", "type", "created", "status")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings", height=10)
        for col, label, width in [
            ("id", "ID", 80),
            ("issuer", "Issuer", 120),
            ("subject", "Subject", 120),
            ("type", "Type", 120),
            ("created", "Created", 140),
            ("status", "Status", 100),
        ]:
            self.tree.heading(col, text=label)
            self.tree.column(col, width=width, anchor="w")

        scrollbar = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.tree.bind("<<TreeviewSelect>>", self._on_select)

        ttk.Button(list_frame, text="Refresh", command=self._load_records).pack(anchor="w", pady=(6, 0))

        ttk.Label(list_frame, text="Record Details").pack(anchor="w", pady=(8, 0))
        self.detail_text = tk.Text(list_frame, height=10, wrap="word")
        self.detail_text.pack(fill="both", expand=False)
        self.detail_text.configure(state="disabled")

    def _browse_file(self) -> None:
        path = filedialog.askopenfilename()
        if path:
            self.file_path_var.set(path)

    def _collect_fields(self) -> tuple[dict[str, str], Path | None]:
        fields = {
            "issuer": self.issuer_entry.get().strip(),
            "subject": self.subject_entry.get().strip(),
            "credential_type": self.type_entry.get().strip(),
            "details": self.details_text.get("1.0", "end").strip(),
        }
        file_value = self.file_path_var.get().strip()
        file_path = Path(file_value) if file_value else None
        return fields, file_path

    def _scan(self) -> ScanReport | None:
        fields, file_path = self._collect_fields()
        for key in ("issuer", "subject", "credential_type", "details"):
            if not fields[key]:
                messagebox.showwarning("Missing data", f"{key} is required.")
                return None
        report = self.antivirus.scan(fields, file_path)
        if report.status == "clean":
            self.status_var.set("Scan OK. No blocked signatures detected.")
        else:
            self.status_var.set(f"Scan blocked: {', '.join(report.issues)}")
        return report

    def _save(self) -> None:
        fields, file_path = self._collect_fields()
        report = self._scan()
        if not report:
            return
        if report.status != "clean":
            messagebox.showerror("Scan blocked", "Data blocked by crypto antivirus.")
            return
        attachment = None
        if file_path:
            attachment = {
                "name": file_path.name,
                "hash": report.file_hash,
            }
        record = {
            "id": uuid.uuid4().hex,
            "issuer": fields["issuer"],
            "subject": fields["subject"],
            "credential_type": fields["credential_type"],
            "details": fields["details"],
            "attachment": attachment,
            "created_at": _utc_now(),
            "scan": {
                "status": report.status,
                "issues": report.issues,
                "text_hashes": report.text_hashes,
                "file_hash": report.file_hash,
                "combined_hash": report.combined_hash,
            },
        }
        self.store.append_record(record)
        self.status_var.set("Record saved and encrypted.")
        self._load_records()
        self._clear(clear_status=False)

    def _clear(self, clear_status: bool = True) -> None:
        self.issuer_entry.delete(0, tk.END)
        self.subject_entry.delete(0, tk.END)
        self.type_entry.delete(0, tk.END)
        self.details_text.delete("1.0", tk.END)
        self.file_path_var.set("")
        if clear_status:
            self.status_var.set("Ready.")

    def _load_records(self) -> None:
        self.records = self.store.load_records()
        self.record_index_by_iid.clear()
        self.tree.delete(*self.tree.get_children())
        for idx, record in enumerate(self.records):
            iid = f"rec-{idx}"
            self.record_index_by_iid[iid] = idx
            if record.get("_error"):
                values = ("CORRUPT", "", "", "", "", "DECRYPT_ERROR")
            else:
                short_id = record["id"][:8]
                created = record.get("created_at", "")[:19]
                status = "OK" if record.get("_signature_valid") else "CHECK"
                scan_status = record.get("scan", {}).get("status", "unknown")
                values = (
                    short_id,
                    record.get("issuer", ""),
                    record.get("subject", ""),
                    record.get("credential_type", ""),
                    created,
                    f"{scan_status}/{status}",
                )
            self.tree.insert("", "end", iid=iid, values=values)

    def _on_select(self, _event: tk.Event) -> None:
        selection = self.tree.selection()
        if not selection:
            return
        idx = self.record_index_by_iid.get(selection[0])
        if idx is None:
            return
        self._show_record_details(self.records[idx])

    def _show_record_details(self, record: dict) -> None:
        if record.get("_error"):
            text = "Record could not be decrypted."
        else:
            signature_ok = record.get("_signature_valid")
            scan = record.get("scan", {})
            attachment = record.get("attachment") or {}
            text = "\n".join(
                [
                    f"ID: {record.get('id', '')}",
                    f"Issuer: {record.get('issuer', '')}",
                    f"Subject: {record.get('subject', '')}",
                    f"Type: {record.get('credential_type', '')}",
                    f"Created: {record.get('created_at', '')}",
                    f"Attachment: {attachment.get('name', 'none')}",
                    f"Attachment Hash: {attachment.get('hash', '')}",
                    f"Payload Hash: {record.get('payload_hash', '')}",
                    f"Signature Valid: {signature_ok}",
                    f"Scan Status: {scan.get('status', '')}",
                    f"Scan Issues: {', '.join(scan.get('issues', []))}",
                    "",
                    "Details:",
                    record.get("details", ""),
                ]
            )
        self.detail_text.configure(state="normal")
        self.detail_text.delete("1.0", tk.END)
        self.detail_text.insert("1.0", text)
        self.detail_text.configure(state="disabled")


def main() -> None:
    root = tk.Tk()
    CredentialRegistryApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
