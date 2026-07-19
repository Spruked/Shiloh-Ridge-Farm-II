"""Governed, source-grounded substrate access for Shep.

Original substrate sources are read-only.  Derived manifests, text, OCR, and
escalations live under the project-controlled ``vault_system/substrate/derived`` tree.
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - health endpoint reports this
    PdfReader = None

try:
    import fitz
except Exception:  # pragma: no cover - OCR endpoint reports this
    fitz = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DERIVED_ROOT = Path(os.environ.get("SHEP_DERIVED_ROOT", PROJECT_ROOT / "substrate" / "derived"))
R_DRIVE_ROOT = Path(os.environ.get("R_DRIVE_ROOT", "/mnt/r"))
SUBSTRATE_ROOT = Path(os.environ.get("SHEP_SUBSTRATE_ROOT", R_DRIVE_ROOT))
MESH_ROOT = Path(os.environ.get("SHEP_ORB_MESH_ROOT", R_DRIVE_ROOT / "orb_mesh"))
READ_ONLY = os.environ.get("SHEP_SUBSTRATE_READ_ONLY", "true").lower() not in {"0", "false", "no"}
MANIFEST_PATH = DERIVED_ROOT / "manifests" / "latest_scan.json"
INDEX_PATH = DERIVED_ROOT / "indexes" / "substrate_index.json"
OCR_ROOT = DERIVED_ROOT / "ocr"
ESCALATION_ROOT = DERIVED_ROOT / "escalations"
MESH_OUTBOX = MESH_ROOT / "results" / "web"
TESSDATA_DIR = Path(os.environ.get("TESSDATA_PREFIX") or "/usr/share/tesseract-ocr/5/tessdata")

TEXT_EXTENSIONS = {".txt", ".md", ".json", ".jsonl", ".csv", ".tsv", ".yaml", ".yml", ".html"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
SUPPORTED_EXTENSIONS = TEXT_EXTENSIONS | IMAGE_EXTENSIONS | {".pdf"}
DEFAULT_EXCLUDES = {"node_modules", ".git", ".venv", "__pycache__", "cache", ".cache"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_derived() -> None:
    for path in (MANIFEST_PATH.parent, INDEX_PATH.parent, OCR_ROOT, ESCALATION_ROOT):
        path.mkdir(parents=True, exist_ok=True)


def _atomic_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        temporary = Path(handle.name)
    temporary.replace(path)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _safe_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(SUBSTRATE_ROOT.resolve()))
    except ValueError:
        try:
            return str(path.resolve().relative_to(PROJECT_ROOT.resolve()))
        except ValueError:
            return path.name


def resolve_source(relative_path: str) -> Path:
    candidate = (SUBSTRATE_ROOT / relative_path).resolve()
    root = SUBSTRATE_ROOT.resolve()
    if candidate != root and root not in candidate.parents:
        raise ValueError("Source path escapes the configured substrate root")
    return candidate


def make_pointer(path: Path, **fields: Any) -> Dict[str, Any]:
    relative = _safe_relative(path)
    stable_key = "|".join(str(fields.get(key) or "") for key in ("record_id", "animal_id", "page_number", "section", "chunk_id"))
    source_id = hashlib.sha256(f"{relative}|{stable_key}".encode()).hexdigest()[:20]
    pointer = {
        "source_id": source_id,
        "source_type": fields.pop("source_type", path.suffix.lower().lstrip(".") or "file"),
        "display_name": fields.pop("display_name", path.name),
        "relative_path": relative,
        "record_id": fields.pop("record_id", None),
        "animal_id": fields.pop("animal_id", None),
        "document_id": fields.pop("document_id", None),
        "page_number": fields.pop("page_number", None),
        "section": fields.pop("section", None),
        "chunk_id": fields.pop("chunk_id", None),
        "line_start": fields.pop("line_start", None),
        "line_end": fields.pop("line_end", None),
        "content_hash": fields.pop("content_hash", None),
        "scan_id": fields.pop("scan_id", None),
        "retrieved_at": _now(),
        "confidence": fields.pop("confidence", 1.0),
        "open_action": {"type": "substrate_source", "source_id": source_id, "relative_path": relative},
        **fields,
    }
    return {key: value for key, value in pointer.items() if value is not None}


def _extract_pdf(path: Path) -> List[Dict[str, Any]]:
    if PdfReader is None:
        raise RuntimeError("pypdf is not installed")
    pages = []
    for number, page in enumerate(PdfReader(str(path)).pages, start=1):
        text = (page.extract_text() or "").strip()
        pages.append({"page_number": number, "text": text, "method": "embedded"})
    return pages


def extract_text(path: Path) -> List[Dict[str, Any]]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf(path)
    if suffix in TEXT_EXTENSIONS:
        text = path.read_text(encoding="utf-8", errors="replace")
        return [{"page_number": None, "text": text, "method": "embedded"}]
    return []


def _chunks(text: str, page_number: Optional[int], max_chars: int = 1800) -> Iterable[Dict[str, Any]]:
    lines = text.splitlines()
    start = 0
    bucket: List[str] = []
    size = 0
    sequence = 0
    for offset, line in enumerate(lines):
        if bucket and size + len(line) > max_chars:
            yield {"chunk_id": f"p{page_number or 0}-c{sequence}", "page_number": page_number, "line_start": start + 1, "line_end": offset, "text": "\n".join(bucket)}
            sequence += 1
            start, bucket, size = offset, [], 0
        bucket.append(line)
        size += len(line) + 1
    if bucket:
        yield {"chunk_id": f"p{page_number or 0}-c{sequence}", "page_number": page_number, "line_start": start + 1, "line_end": len(lines), "text": "\n".join(bucket)}


def scan_substrate(max_files: Optional[int] = None) -> Dict[str, Any]:
    _ensure_derived()
    scan_id = f"scan_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}_{uuid.uuid4().hex[:6]}"
    started = _now()
    previous = {}
    if INDEX_PATH.exists():
        try:
            previous = {item["relative_path"]: item for item in json.loads(INDEX_PATH.read_text()).get("sources", [])}
        except Exception:
            previous = {}
    counts = {key: 0 for key in ("files_discovered", "files_indexed", "files_skipped", "unsupported_files", "permission_failures", "unreadable_files", "text_extraction_failures", "ocr_attempts", "ocr_successes", "ocr_failures", "duplicate_files", "changed_files", "removed_files")}
    sources, failures, seen_hashes = [], [], {}
    root_reachable = SUBSTRATE_ROOT.exists() and SUBSTRATE_ROOT.is_dir()
    if root_reachable:
        for directory, dirnames, filenames in os.walk(SUBSTRATE_ROOT):
            dirnames[:] = [name for name in dirnames if name not in DEFAULT_EXCLUDES]
            for filename in filenames:
                counts["files_discovered"] += 1
                if max_files and counts["files_discovered"] > max_files:
                    break
                path = Path(directory) / filename
                suffix = path.suffix.lower()
                if suffix not in SUPPORTED_EXTENSIONS:
                    counts["unsupported_files"] += 1
                    continue
                try:
                    stat = path.stat()
                    digest = _sha256(path)
                    if digest in seen_hashes:
                        counts["duplicate_files"] += 1
                    else:
                        seen_hashes[digest] = str(path)
                    relative = _safe_relative(path)
                    old = previous.get(relative)
                    if old and old.get("content_hash") != digest:
                        counts["changed_files"] += 1
                    chunks = []
                    requires_ocr = suffix in IMAGE_EXTENSIONS
                    if suffix in TEXT_EXTENSIONS or suffix == ".pdf":
                        try:
                            pages = extract_text(path)
                            requires_ocr = suffix == ".pdf" and not any(len(p["text"].strip()) >= 40 for p in pages)
                            for page in pages:
                                chunks.extend(_chunks(page["text"], page["page_number"]))
                        except Exception as exc:
                            counts["text_extraction_failures"] += 1
                            failures.append({"path": relative, "stage": "text_extraction", "error": str(exc)})
                    sources.append({"source_id": hashlib.sha256(relative.encode()).hexdigest()[:20], "relative_path": relative, "display_name": path.name, "source_type": suffix.lstrip("."), "size": stat.st_size, "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(), "content_hash": digest, "requires_ocr": requires_ocr, "chunks": chunks})
                    counts["files_indexed"] += 1
                except PermissionError as exc:
                    counts["permission_failures"] += 1
                    failures.append({"path": str(path), "stage": "read", "error": str(exc)})
                except Exception as exc:
                    counts["unreadable_files"] += 1
                    failures.append({"path": str(path), "stage": "read", "error": str(exc)})
            if max_files and counts["files_discovered"] > max_files:
                break
    current_paths = {item["relative_path"] for item in sources}
    counts["removed_files"] = len(set(previous) - current_paths) if not max_files else 0
    counts["files_skipped"] = counts["unsupported_files"] + counts["permission_failures"] + counts["unreadable_files"]
    complete = root_reachable and not max_files and not failures
    status = "complete" if complete else "partial" if root_reachable else "failed"
    manifest = {"schema": "shep.substrate.scan.v1", "scan_id": scan_id, "configured_roots": [{"path": str(SUBSTRATE_ROOT), "reachable": root_reachable, "mode": "read_only" if READ_ONLY else "governed_write"}, {"path": str(MESH_ROOT), "reachable": MESH_ROOT.exists(), "mode": "append_only_read_write"}], "started_at": started, "completed_at": _now(), "status": status, "complete": complete, "counts": counts, "failures": failures[:500], "excludes": sorted(DEFAULT_EXCLUDES)}
    _atomic_json(INDEX_PATH, {"schema": "shep.substrate.index.v1", "scan_id": scan_id, "sources": sources})
    _atomic_json(MANIFEST_PATH, manifest)
    return manifest


def scan_status() -> Dict[str, Any]:
    if not MANIFEST_PATH.exists():
        return {"status": "not_scanned", "complete": False, "configured_root": str(SUBSTRATE_ROOT)}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def list_sources(limit: int = 100, source_type: Optional[str] = None) -> Dict[str, Any]:
    if not INDEX_PATH.exists():
        return {"sources": [], "scan_status": scan_status()}
    sources = json.loads(INDEX_PATH.read_text()).get("sources", [])
    if source_type:
        sources = [item for item in sources if item.get("source_type") == source_type.lstrip(".").lower()]
    return {"sources": [{key: value for key, value in item.items() if key != "chunks"} for item in sources[: max(1, min(limit, 1000))]], "total": len(sources), "scan_status": scan_status()}


def search(query: str, limit: int = 8) -> Dict[str, Any]:
    terms = [term for term in re.findall(r"[a-z0-9-]{2,}", query.lower()) if term not in {"the", "and", "for", "this", "that", "what", "where"}]
    if not INDEX_PATH.exists():
        return {"query": query, "results": [], "warnings": ["Substrate has not been scanned."], "scan_status": scan_status()}
    results = []
    for source in json.loads(INDEX_PATH.read_text()).get("sources", []):
        for chunk in source.get("chunks", []):
            haystack = f"{source['display_name']} {source['relative_path']} {chunk['text']}".lower()
            score = sum(haystack.count(term) for term in terms)
            if score:
                pointer = make_pointer(resolve_source(source["relative_path"]), page_number=chunk.get("page_number"), chunk_id=chunk.get("chunk_id"), line_start=chunk.get("line_start"), line_end=chunk.get("line_end"), content_hash=source.get("content_hash"), scan_id=scan_status().get("scan_id"), confidence=min(0.99, 0.55 + score * 0.08))
                results.append({"score": score, "excerpt": chunk["text"][:700], "pointer": pointer})
    results.sort(key=lambda item: item["score"], reverse=True)
    return {"query": query, "results": results[: max(1, min(limit, 50))], "scan_status": scan_status(), "warnings": [] if results else ["No supporting source matched the query."]}


def read_source(relative_path: str, page_number: Optional[int] = None, chunk_id: Optional[str] = None) -> Dict[str, Any]:
    path = resolve_source(relative_path)
    if not path.is_file():
        raise FileNotFoundError(relative_path)
    pages = extract_text(path)
    chunks = [chunk for page in pages for chunk in _chunks(page["text"], page["page_number"])]
    if page_number is not None:
        chunks = [item for item in chunks if item.get("page_number") == page_number]
    if chunk_id:
        chunks = [item for item in chunks if item.get("chunk_id") == chunk_id]
    return {"content": chunks, "pointer": make_pointer(path, page_number=page_number, chunk_id=chunk_id, content_hash=_sha256(path))}


def ocr(relative_path: str, page_number: Optional[int] = None, language: str = "eng", force: bool = False) -> Dict[str, Any]:
    _ensure_derived()
    path = resolve_source(relative_path)
    digest = _sha256(path)
    cache_path = OCR_ROOT / f"{digest}_{page_number or 'all'}_{language}.json"
    if cache_path.exists() and not force:
        return json.loads(cache_path.read_text())
    if not shutil.which("tesseract"):
        raise RuntimeError("Tesseract executable is unavailable")
    images: List[tuple[Optional[int], Path]] = []
    temporary_paths: List[Path] = []
    if path.suffix.lower() == ".pdf":
        if fitz is None:
            raise RuntimeError("PyMuPDF is required to render PDF pages for OCR")
        document = fitz.open(path)
        selected = [page_number - 1] if page_number else list(range(len(document)))
        for index in selected:
            pixmap = document[index].get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
            output = Path(tempfile.mkstemp(suffix=".png")[1])
            pixmap.save(output)
            temporary_paths.append(output)
            images.append((index + 1, output))
    elif path.suffix.lower() in IMAGE_EXTENSIONS:
        images.append((None, path))
    else:
        raise ValueError("OCR supports PDF and image sources")
    pages = []
    try:
        for number, image in images:
            process = subprocess.run(["tesseract", str(image), "stdout", "--tessdata-dir", str(TESSDATA_DIR), "-l", language], capture_output=True, text=True, timeout=180)
            if process.returncode:
                raise RuntimeError(process.stderr.strip() or "Tesseract failed")
            text = process.stdout.strip()
            pages.append({"page_number": number, "text": text, "confidence": 0.75 if text else 0.0})
    finally:
        for item in temporary_paths:
            item.unlink(missing_ok=True)
    try:
        derived_text = str(cache_path.relative_to(PROJECT_ROOT))
    except ValueError:
        derived_text = str(cache_path)
    result = {"source": relative_path, "content_hash": digest, "engine": "tesseract", "engine_version": subprocess.run(["tesseract", "--version"], capture_output=True, text=True).stdout.splitlines()[0], "language": language, "created_at": _now(), "pages": pages, "pointer": make_pointer(path, source_type="ocr", page_number=page_number, content_hash=digest, confidence=min((p["confidence"] for p in pages), default=0.0), derived_text=derived_text)}
    _atomic_json(cache_path, result)
    return result


def health() -> Dict[str, Any]:
    tessdata = TESSDATA_DIR
    languages = sorted(item.stem for item in tessdata.glob("*.traineddata")) if tessdata.exists() else []
    return {"status": "healthy" if SUBSTRATE_ROOT.exists() else "degraded", "substrate_root": str(SUBSTRATE_ROOT), "substrate_reachable": SUBSTRATE_ROOT.exists(), "read_only_sources": READ_ONLY, "mesh_root": str(MESH_ROOT), "mesh_reachable": MESH_ROOT.exists(), "mesh_mode": "append_only_read_write", "derived_root": str(DERIVED_ROOT), "tesseract": shutil.which("tesseract"), "tesseract_languages": languages, "pdf_text_available": PdfReader is not None, "pdf_ocr_available": fitz is not None, "scan_status": scan_status()}


def create_escalation(payload: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_derived()
    escalation_id = f"ESC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    record = {"escalation_id": escalation_id, "created_at": _now(), "status": "open", "priority": payload.get("priority", "normal"), "confidence": payload.get("confidence", 0.0), "conversation_id": payload.get("conversation_id"), "request_id": payload.get("request_id"), "user_request": payload.get("user_request", ""), "interpreted_intent": payload.get("interpreted_intent", ""), "reason": payload.get("reason", "Human review requested"), "missing_information": payload.get("missing_information", []), "conflicting_information": payload.get("conflicting_information", []), "attempted_tool_calls": payload.get("attempted_tool_calls", []), "evidence": payload.get("evidence", []), "recommended_human_action": payload.get("recommended_human_action", "Review available evidence and record a decision."), "requested_approval": payload.get("requested_approval"), "assigned_reviewer": payload.get("assigned_reviewer"), "human_resolution": None, "resolved_at": None}
    path = ESCALATION_ROOT / f"{escalation_id}.json"
    _atomic_json(path, record)
    if MESH_ROOT.exists():
        try:
            mesh_payload = {"schema": "orb.mesh.escalation.v1", "operation": "append", **record}
            envelope = {"artifact_id": escalation_id, "artifact_type": "task", "source_orb": "web", "target_orb": "desktop", "created_at": record["created_at"], "updated_at": record["created_at"], "confidence": record["confidence"], "priority": record["priority"], "content_hash": hashlib.sha256(json.dumps(mesh_payload, sort_keys=True).encode()).hexdigest(), "tags": ["shiloh-ridge", "human-escalation"], "payload": mesh_payload}
            _atomic_json(MESH_OUTBOX / f"{escalation_id}.json", envelope)
        except Exception as exc:
            record["mesh_warning"] = str(exc)
    return record


def publish_orb_artifact(
    artifact_type: str,
    payload: Dict[str, Any],
    *,
    source_orb: str,
    target_orb: str = "shared",
    tags: Optional[List[str]] = None,
    confidence: float = 0.8,
) -> Dict[str, Any]:
    """Append a privacy-filtered learning or handoff envelope to the ORB mesh."""
    created_at = _now()
    artifact_id = f"{source_orb.upper()}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}-{uuid.uuid4().hex[:8]}"
    content_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()
    envelope = {
        "artifact_id": artifact_id,
        "artifact_type": artifact_type,
        "source_orb": source_orb,
        "target_orb": target_orb,
        "created_at": created_at,
        "updated_at": created_at,
        "confidence": max(0.0, min(1.0, confidence)),
        "content_hash": content_hash,
        "tags": tags or ["shiloh-ridge"],
        "payload": payload,
    }
    if not MESH_ROOT.exists():
        return {**envelope, "published": False, "warning": "ORB mesh is unavailable"}
    _atomic_json(MESH_OUTBOX / f"{artifact_id}.json", envelope)
    return {**envelope, "published": True}


def list_escalations(status: Optional[str] = "open") -> List[Dict[str, Any]]:
    _ensure_derived()
    records = []
    for path in sorted(ESCALATION_ROOT.glob("ESC-*.json"), reverse=True):
        try:
            item = json.loads(path.read_text())
            if status is None or item.get("status") == status:
                records.append(item)
        except Exception:
            continue
    return records


def get_escalation(escalation_id: str) -> Dict[str, Any]:
    path = ESCALATION_ROOT / f"{Path(escalation_id).name}.json"
    if not path.exists():
        raise FileNotFoundError(escalation_id)
    return json.loads(path.read_text())


def resolve_escalation(escalation_id: str, resolution: str, reviewer: Optional[str] = None) -> Dict[str, Any]:
    record = get_escalation(escalation_id)
    record.update({"status": "resolved", "human_resolution": resolution, "assigned_reviewer": reviewer or record.get("assigned_reviewer"), "resolved_at": _now()})
    _atomic_json(ESCALATION_ROOT / f"{Path(escalation_id).name}.json", record)
    if MESH_ROOT.exists():
        mesh_payload = {"schema": "orb.mesh.escalation_resolution.v1", "operation": "append", **record}
        envelope = {"artifact_id": f"{escalation_id}-resolution", "artifact_type": "result", "source_orb": "web", "target_orb": "shared", "created_at": record["resolved_at"], "updated_at": record["resolved_at"], "confidence": 1.0, "priority": record["priority"], "content_hash": hashlib.sha256(json.dumps(mesh_payload, sort_keys=True).encode()).hexdigest(), "tags": ["shiloh-ridge", "human-resolution"], "payload": mesh_payload}
        _atomic_json(MESH_OUTBOX / f"{escalation_id}_resolution.json", envelope)
    return record
