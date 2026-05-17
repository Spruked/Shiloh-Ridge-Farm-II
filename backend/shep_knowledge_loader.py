"""
shep_knowledge_loader.py
─────────────────────────────────────────────────────────────────────────────
Loads Shep's farm knowledge from a CSV file into the SEED_KNOWLEDGE format
used by product_assistant.py.

CSV columns:
  key, title, triggers, response, suggestions, tags

Multi-value fields (triggers, suggestions, tags) use | as the separator.

Usage:
    from shep_knowledge_loader import load_shep_knowledge
    SEED_KNOWLEDGE = load_shep_knowledge()
"""

import csv
import os
from pathlib import Path
from typing import Any, Dict, List

_DEFAULT_CSV = Path(__file__).resolve().parents[1] / "assets" / "shep_farm_knowledge.csv"


def _split_field(value: str) -> List[str]:
    """Split a pipe-separated CSV field into a list, stripping whitespace."""
    return [item.strip() for item in value.split("|") if item.strip()]


def load_shep_knowledge(csv_path: Path = _DEFAULT_CSV) -> List[Dict[str, Any]]:
    """
    Parse shep_farm_knowledge.csv and return a list of knowledge entries
    compatible with SEED_KNOWLEDGE in product_assistant.py.

    Falls back to an empty list and logs a warning if the file is missing.
    """
    if not csv_path.exists():
        print(f"[shep_knowledge_loader] WARNING: knowledge CSV not found at {csv_path}")
        return []

    entries: List[Dict[str, Any]] = []
    try:
        with open(csv_path, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                key = row.get("key", "").strip()
                if not key:
                    continue
                entries.append({
                    "key": key,
                    "title": row.get("title", "").strip(),
                    "triggers": _split_field(row.get("triggers", "")),
                    "response": row.get("response", "").strip(),
                    "suggestions": _split_field(row.get("suggestions", "")),
                    "tags": _split_field(row.get("tags", "")),
                    "active": True,
                    "source": "seed",
                    "helpful_count": 0,
                    "unhelpful_count": 0,
                    "use_count": 0,
                    "last_used_at": None,
                })
    except Exception as exc:
        print(f"[shep_knowledge_loader] ERROR loading knowledge CSV: {exc}")
        return []

    print(f"[shep_knowledge_loader] Loaded {len(entries)} knowledge entries from {csv_path.name}")
    return entries
