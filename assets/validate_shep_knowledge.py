#!/usr/bin/env python3
"""
Validate assets/shep_farm_knowledge.csv
Checks: row count, required columns, no empty required fields,
no duplicate keys, no forbidden public terms.
"""

import csv
import sys
from pathlib import Path

CSV_PATH = Path(__file__).parent / "shep_farm_knowledge.csv"
REQUIRED_COLUMNS = {"key", "title", "triggers", "response", "suggestions", "tags"}
REQUIRED_NONEMPTY = {"key", "title", "triggers", "response"}
MIN_ROWS = 100
FORBIDDEN_TERMS = [
    "CALI",
    "substrate",
    "swarm",
    "mesh",
    "admin assistant",
    "private records",
    "system prompt",
]


def validate():
    if not CSV_PATH.exists():
        print(f"FAIL: file not found: {CSV_PATH}")
        sys.exit(1)

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        columns = set(reader.fieldnames or [])

    errors = []

    # Column check
    missing_cols = REQUIRED_COLUMNS - columns
    if missing_cols:
        errors.append(f"Missing columns: {missing_cols}")

    # Row count
    if len(rows) < MIN_ROWS:
        errors.append(f"Row count {len(rows)} is below minimum {MIN_ROWS}")

    # Per-row checks
    seen_keys = {}
    for i, row in enumerate(rows, start=2):
        row_id = row.get("key") or f"row_{i}"

        for col in REQUIRED_NONEMPTY:
            if col in columns and not (row.get(col) or "").strip():
                errors.append(f"Row {i} ({row_id}): empty required field '{col}'")

        key = (row.get("key") or "").strip()
        if key:
            if key in seen_keys:
                errors.append(f"Duplicate key '{key}' at rows {seen_keys[key]} and {i}")
            else:
                seen_keys[key] = i

        full_text = " ".join(row.get(col, "") for col in columns)
        for term in FORBIDDEN_TERMS:
            if term.lower() in full_text.lower():
                errors.append(f"Row {i} ({row_id}): forbidden term '{term}'")

    if errors:
        print(f"FAIL — {len(errors)} error(s):")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)
    else:
        print(f"PASS — {len(rows)} rows, {len(columns)} columns, no errors.")


if __name__ == "__main__":
    validate()
