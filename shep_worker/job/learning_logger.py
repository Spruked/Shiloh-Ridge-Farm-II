import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


class ShepLearningLogger:
    def __init__(self, shep_root: Path):
        self.shep_root = Path(shep_root)
        vault_root = Path(os.getenv("SHILOH_VAULT_SYSTEM_ROOT", self.shep_root.parent / "vault_system"))
        self.trace_dir = vault_root / "shep" / "trace"
        self.vault_dir = vault_root / "shep" / "worker"
        self.trace_dir.mkdir(parents=True, exist_ok=True)
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.learning_path = self.vault_dir / "shep_learning.jsonl"

    def log_unknown(self, learning_id: str, raw_query: str, normalized_query: str, session_id: str, page: str) -> None:
        record = {
            "id": learning_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "raw_query": raw_query,
            "normalized_query": normalized_query,
            "session_id": session_id,
            "page_context": page,
            "status": "pending",
        }
        with open(self.learning_path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(record) + "\n")

    def _read_rows(self) -> List[Dict[str, Any]]:
        if not self.learning_path.exists():
            return []
        rows: List[Dict[str, Any]] = []
        with open(self.learning_path, "r", encoding="utf-8") as handle:
            for line in handle:
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return rows

    def get_pending_items(self, limit: int = 50) -> List[Dict[str, Any]]:
        rows = [row for row in self._read_rows() if row.get("status", "pending") == "pending"]
        return rows[-limit:]

    def get_item_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        for row in reversed(self._read_rows()):
            if row.get("id") == item_id:
                return row
        return None

    def update_status(self, item_id: str, status: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        rows = self._read_rows()
        for row in rows:
            if row.get("id") == item_id:
                row["status"] = status
                row["status_metadata"] = metadata or {}
                row["updated_at"] = datetime.now(timezone.utc).isoformat()
        with open(self.learning_path, "w", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row) + "\n")
