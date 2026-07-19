import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import substrate_service as substrate
import shep_substrate_mcp as mcp


def configure_temp(monkeypatch, tmp_path):
    source = tmp_path / "r-drive"
    derived = tmp_path / "derived"
    mesh = tmp_path / "mesh"
    source.mkdir()
    mesh.mkdir()
    monkeypatch.setattr(substrate, "SUBSTRATE_ROOT", source)
    monkeypatch.setattr(substrate, "DERIVED_ROOT", derived)
    monkeypatch.setattr(substrate, "MANIFEST_PATH", derived / "manifests/latest_scan.json")
    monkeypatch.setattr(substrate, "INDEX_PATH", derived / "indexes/substrate_index.json")
    monkeypatch.setattr(substrate, "OCR_ROOT", derived / "ocr")
    monkeypatch.setattr(substrate, "ESCALATION_ROOT", derived / "escalations")
    monkeypatch.setattr(substrate, "MESH_ROOT", mesh)
    monkeypatch.setattr(substrate, "MESH_OUTBOX", mesh / "results/web")
    return source, derived, mesh


def test_scan_search_read_and_stable_pointer(monkeypatch, tmp_path):
    source, _, _ = configure_temp(monkeypatch, tmp_path)
    document = source / "registry-rules.txt"
    document.write_text("Coat type B requires registry inspection.\nTransfers require an owner signature.")
    manifest = substrate.scan_substrate()
    assert manifest["status"] == "complete"
    result = substrate.search("coat type B")
    assert result["results"]
    pointer = result["results"][0]["pointer"]
    assert pointer["relative_path"] == "registry-rules.txt"
    assert pointer["source_id"] == substrate.search("coat type B")["results"][0]["pointer"]["source_id"]
    assert "Coat type B" in substrate.read_source("registry-rules.txt")["content"][0]["text"]


def test_escalation_persists_and_writes_mesh_envelope(monkeypatch, tmp_path):
    _, _, mesh = configure_temp(monkeypatch, tmp_path)
    created = substrate.create_escalation({"user_request": "Change the owner", "reason": "Approval required"})
    assert substrate.get_escalation(created["escalation_id"])["status"] == "open"
    resolved = substrate.resolve_escalation(created["escalation_id"], "Approved", "owner")
    assert resolved["status"] == "resolved"
    envelopes = list((mesh / "results/web").glob("*.json"))
    assert len(envelopes) == 2
    assert json.loads(envelopes[0].read_text())["source_orb"] == "web"


def test_mcp_lists_and_rejects_unknown_methods():
    listed = mcp.dispatch({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
    names = {tool["name"] for tool in listed["result"]["tools"]}
    assert "substrate.search" in names
    missing = mcp.dispatch({"jsonrpc": "2.0", "id": 2, "method": "missing"})
    assert missing["error"]["code"] == -32601


def test_dynamic_cognitive_modes(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    import admin_orb_routes
    assert admin_orb_routes._derive_cognitive_mode({"message": "hello"})["cognitive_mode"] == "DIRECT"
    assert admin_orb_routes._derive_cognitive_mode({"message": "find sheep SRF-001"})["cognitive_mode"] == "RETRIEVAL"
    assert admin_orb_routes._derive_cognitive_mode({"message": "what do I need to register a lamb?"})["cognitive_mode"] == "RETRIEVAL"
    assert admin_orb_routes._derive_cognitive_mode({"message": "scan this certificate"})["cognitive_mode"] == "OCR"
    assert admin_orb_routes._derive_cognitive_mode({"message": "change the registered owner"})["cognitive_mode"] == "TOOL"
    assert admin_orb_routes._derive_cognitive_mode({"message": "the sire records disagree"})["cognitive_mode"] == "ESCALATE"
