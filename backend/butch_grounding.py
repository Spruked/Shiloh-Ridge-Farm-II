"""Fast, site-scoped evidence pointers for Butch's product answers."""
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Dict, List


def _pointer(path: Path, display_name: str, source_type: str, confidence: float) -> Dict[str, Any]:
    digest = hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
    source_id = hashlib.sha256(display_name.encode()).hexdigest()[:20]
    return {
        "source_id": source_id,
        "source_type": source_type,
        "display_name": display_name,
        "relative_path": display_name,
        "content_hash": digest,
        "confidence": confidence,
        "open_action": {"type": "project_source", "source_id": source_id, "relative_path": display_name},
    }


def butch_evidence() -> List[Dict[str, Any]]:
    candidates = [
        (Path("/assets/butch_product_knowledge.csv"), "assets/butch_product_knowledge.csv", "butcher_knowledge", 0.94),
        (Path("/app/crawl_16.json"), "crawl_16.json", "site_crawl", 0.90),
    ]
    return [_pointer(path, name, kind, confidence) for path, name, kind, confidence in candidates if path.exists()]
