import csv
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict


class ShepKnowledgeUpdater:
    def __init__(self, shep_root: Path):
        self.shep_root = Path(shep_root)
        vault_root = Path(os.getenv("SHILOH_VAULT_SYSTEM_ROOT", self.shep_root.parent / "vault_system"))
        self.vault_dir = vault_root / "shep" / "worker"
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.approved_path = self.vault_dir / "shep_approved.jsonl"
        self.knowledge_path = self.vault_dir / "shep_knowledge.csv"

    def submit_for_approval(self, draft: Dict[str, Any]) -> None:
        record = {
            **draft,
            "status": "pending_human_review",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        }
        with open(self.approved_path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(record) + "\n")

    def human_approve(self, item_id: str, approved_answer: str, approved_by: str, edit_notes: str = "") -> None:
        file_exists = self.knowledge_path.exists()
        with open(self.knowledge_path, "a", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["id", "triggers", "answer", "category", "approved_by", "notes"])
            if not file_exists:
                writer.writeheader()
            writer.writerow(
                {
                    "id": item_id,
                    "triggers": item_id,
                    "answer": approved_answer,
                    "category": "faq",
                    "approved_by": approved_by,
                    "notes": edit_notes,
                }
            )

    def human_reject(self, item_id: str, reason: str, reviewer: str) -> None:
        record = {
            "id": item_id,
            "status": "human_rejected",
            "reason": reason,
            "reviewer": reviewer,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        with open(self.approved_path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(record) + "\n")
