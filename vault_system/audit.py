from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .paths import AUDIT_ROOT, VAULT_ROOT


EVENT_LOG = AUDIT_ROOT / "events.jsonl"
INVENTORY_PATH = AUDIT_ROOT / "inventory.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _atomic_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        temporary = Path(handle.name)
    os.replace(temporary, path)


def append_event(event_type: str, payload: dict[str, Any]) -> None:
    EVENT_LOG.parent.mkdir(parents=True, exist_ok=True)
    record = {"timestamp": _now(), "event_type": event_type, "payload": payload}
    with EVENT_LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=True, default=str) + "\n")


def refresh_inventory() -> dict[str, Any]:
    records: list[dict[str, Any]] = []
    for path in sorted(VAULT_ROOT.rglob("*")):
        if not path.is_file() or path == INVENTORY_PATH:
            continue
        relative = path.relative_to(VAULT_ROOT)
        stat = path.stat()
        records.append(
            {
                "path": relative.as_posix(),
                "subvault": relative.parts[0] if relative.parts else "root",
                "bytes": stat.st_size,
                "sha256": _sha256(path),
                "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
            }
        )
    payload = {
        "schema": "shiloh.one_repo_one_vault.inventory.v1",
        "generated_at": _now(),
        "vault_root": str(VAULT_ROOT),
        "file_count": len(records),
        "total_bytes": sum(record["bytes"] for record in records),
        "records": records,
    }
    _atomic_json(INVENTORY_PATH, payload)
    append_event("inventory_refreshed", {"file_count": payload["file_count"], "total_bytes": payload["total_bytes"]})
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Refresh the canonical Shiloh vault inventory.")
    parser.add_argument("--refresh", action="store_true", help="Write a new hashed inventory.")
    args = parser.parse_args()
    if args.refresh:
        result = refresh_inventory()
        print(json.dumps({key: result[key] for key in ("vault_root", "file_count", "total_bytes")}, indent=2))
