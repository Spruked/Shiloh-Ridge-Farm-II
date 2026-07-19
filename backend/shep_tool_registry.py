"""Explicit tool contracts available to the governed Shep cognitive layer."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Callable, Dict

import substrate_service as substrate


VAULT_SYSTEM_ROOT = Path(os.environ.get("SHILOH_VAULT_SYSTEM_ROOT", "/app/vault_system"))
POINTER_MAP_PATH = VAULT_SYSTEM_ROOT / "farm_orb" / "pointer_plot_map.json"


def _pointer_lookup(arguments: Dict[str, Any]) -> Dict[str, Any]:
    if not POINTER_MAP_PATH.exists():
        return {"status": "unavailable", "reason": "pointer_plot_map_missing"}
    payload = json.loads(POINTER_MAP_PATH.read_text(encoding="utf-8"))
    query = str(arguments.get("query") or "").strip().lower()
    page_route = str(arguments.get("page_route") or "").strip().rstrip("/")
    ranked = []
    for record in payload.get("records", []):
        record_route = str(record.get("page_route") or "").rstrip("/")
        if page_route and not record_route.endswith(page_route):
            continue
        aliases = [record.get("meaning", ""), *(record.get("intent_aliases") or []), *(record.get("direct_aliases") or [])]
        text = " ".join(str(value).lower() for value in aliases)
        score = sum(1 for term in query.split() if term and term in text)
        if query and query in text:
            score += 5
        if score or (page_route and record_route.endswith(page_route)):
            ranked.append((score, float(record.get("confidence") or 0.0), record))
    ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return {
        "status": "ok",
        "schema": payload.get("schema"),
        "generated_at": payload.get("generated_at"),
        "matches": [item[2] for item in ranked[: max(1, min(int(arguments.get("limit") or 5), 10))]],
    }


TOOLS: Dict[str, Dict[str, Any]] = {
    "substrate.health": {"handler": lambda _: substrate.health(), "schema": {}},
    "substrate.list_sources": {"handler": lambda a: substrate.list_sources(a.get("limit", 100), a.get("source_type")), "schema": {"limit": "integer", "source_type": "string?"}},
    "substrate.inventory": {"handler": lambda a: substrate.scan_substrate(a.get("max_files")), "schema": {"max_files": "integer?"}},
    "substrate.scan_status": {"handler": lambda _: substrate.scan_status(), "schema": {}},
    "substrate.search": {"handler": lambda a: substrate.search(a["query"], a.get("limit", 8)), "schema": {"query": "string", "limit": "integer?"}},
    "substrate.read": {"handler": lambda a: substrate.read_source(a["relative_path"], a.get("page_number"), a.get("chunk_id")), "schema": {"relative_path": "string", "page_number": "integer?", "chunk_id": "string?"}},
    "substrate.get_pointer": {"handler": lambda a: substrate.make_pointer(substrate.resolve_source(a["relative_path"]), **{k: v for k, v in a.items() if k != "relative_path"}), "schema": {"relative_path": "string"}},
    "substrate.ocr": {"handler": lambda a: substrate.ocr(a["relative_path"], a.get("page_number"), a.get("language", "eng"), a.get("force", False)), "schema": {"relative_path": "string", "page_number": "integer?", "language": "string?", "force": "boolean?"}},
    "farm_orb.pointer_lookup": {"handler": _pointer_lookup, "schema": {"query": "string", "page_route": "string?", "limit": "integer?"}},
    "escalation.create": {"handler": substrate.create_escalation, "schema": {"user_request": "string", "reason": "string"}},
    "escalation.list": {"handler": lambda a: substrate.list_escalations(a.get("status", "open")), "schema": {"status": "string?"}},
    "escalation.read": {"handler": lambda a: substrate.get_escalation(a["escalation_id"]), "schema": {"escalation_id": "string"}},
    "escalation.resolve": {"handler": lambda a: substrate.resolve_escalation(a["escalation_id"], a["resolution"], a.get("reviewer")), "schema": {"escalation_id": "string", "resolution": "string", "reviewer": "string?"}},
}


def describe_tools() -> list[Dict[str, Any]]:
    return [{"name": name, "input_schema": spec["schema"]} for name, spec in TOOLS.items()]


def call_tool(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    if name not in TOOLS:
        raise KeyError(f"Unknown Shep tool: {name}")
    return {"tool": name, "ok": True, "result": TOOLS[name]["handler"](arguments or {})}
