from __future__ import annotations

import asyncio
import base64
import csv
import hashlib
import json
import logging
import os
import re
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from auth import verify_token
from renova_adapter import get_renova_status, run_renova_preflight
from shep_tool_registry import call_tool
import substrate_service as shep_substrate
try:
    from orb_assistant.mesh_bridge import MeshBridge
    from orb_assistant.orb_core import OrbCore
    from orb_assistant import ingest_arms_variables as arms_ingest
except ModuleNotFoundError:
    class MeshBridge:
        available = False

        def export_interaction_insight(self, *_args, **_kwargs):
            return None

    class OrbCore:
        async def process_message(self, message: str, **_kwargs) -> Dict[str, Any]:
            return {
                "response": f"Shep is online in compatibility mode. I heard: {message}",
                "response_text": f"Shep is online in compatibility mode. I heard: {message}",
                "intent": "compatibility",
                "confidence": 0.45,
                "mesh_connected": False,
            }

    class _ArmsIngestFallback:
        CSV_SOURCE = Path("/assets/shep_farm_knowledge.csv")
        A_PRIORI_PATH = Path("/tmp/a_priori.json")
        SUBSTRATE_DIR = Path("/tmp")
        PROMOTED_DIR = Path("/tmp")

        @staticmethod
        def parse_csv(_source):
            return {}, {}

        @staticmethod
        def build_domain_block(_reports, _variable_index):
            return {"total_variables": 0, "total_reports": 0}

        @staticmethod
        def update_a_priori_vault(_domain_block):
            return None

        @staticmethod
        def write_substrate_archive(_domain_block):
            return None

        @staticmethod
        def write_mesh_artifact(_domain_block):
            return None

    arms_ingest = _ArmsIngestFallback()

logger = logging.getLogger(__name__)

# ── Wire to the live Renova_te_ipsum sovereign system ────────────────────────
_RITI_CANDIDATES = [
    Path("/app/Renova_te_ipsum"),
    Path(__file__).resolve().parent.parent / "Renova_te_ipsum",
    Path.cwd() / "Renova_te_ipsum",
]
_RITI = next((candidate for candidate in _RITI_CANDIDATES if candidate.exists()), None)
if _RITI is not None and str(_RITI) not in sys.path:
    sys.path.insert(0, str(_RITI))

_mesh = MeshBridge()
_local_orb_core = OrbCore()

router = APIRouter(prefix="/orb", tags=["Shiloh Ridge Custom ORB"])
ORB_OVERRIDE_PATH = Path(os.environ.get("SHEP_OVERRIDE_PATH", "/app/vault_system/shep/state/override.json"))
ORB_ADMIN_STATE_PATH = Path(os.environ.get("SHEP_ADMIN_STATE_PATH", "/app/vault_system/shep/state/admin_state.json"))

def _windows_host_from_wsl() -> str:
    if os.name == "nt":
        return "127.0.0.1"
    try:
        result = subprocess.run(
            ["sh", "-lc", "ip route | awk '/default/ {print $3; exit}'"],
            check=False,
            capture_output=True,
            text=True,
            timeout=2,
        )
        host = result.stdout.strip()
        if host:
            return host
    except Exception:
        pass
    try:
        resolv = Path("/etc/resolv.conf").read_text(encoding="utf-8", errors="ignore")
        for line in resolv.splitlines():
            parts = line.strip().split()
            if len(parts) == 2 and parts[0] == "nameserver":
                return parts[1]
    except Exception:
        pass
    return "127.0.0.1"


def _looks_like_private_bridge_host(host: str) -> bool:
    return host.startswith(("10.", "172.", "192.168."))


def _default_qwen_tts_url() -> str:
    return "http://127.0.0.1:9880/speak"


def _default_kokoro_tts_url() -> str:
    return "http://127.0.0.1:12000/api/kokoro/tts"


def _service_url_candidates(url: str) -> list[str]:
    candidates = [url]
    if os.environ.get("SHEP_ENABLE_WSL_BRIDGE_CANDIDATES", "true").strip().lower() not in ("1", "true", "yes", "on"):
        return [candidate for candidate in candidates if candidate]
    host = _windows_host_from_wsl()
    for local in ("127.0.0.1", "localhost"):
        if local in url and host not in ("127.0.0.1", "localhost") and _looks_like_private_bridge_host(host):
            candidates.append(url.replace(local, host, 1))
    seen = set()
    return [candidate for candidate in candidates if candidate and not (candidate in seen or seen.add(candidate))]


def _tts_url_candidates(url: str) -> list[str]:
    candidates = _service_url_candidates(url)
    port_alternates = []
    for candidate in candidates:
        if ":12000" in candidate:
            port_alternates.append(candidate.replace(":12000", ":8000", 1))
        if ":8000" in candidate:
            port_alternates.append(candidate.replace(":8000", ":12000", 1))
    for alternate in port_alternates:
        candidates.extend(_service_url_candidates(alternate))
    seen = set()
    return [candidate for candidate in candidates if candidate and not (candidate in seen or seen.add(candidate))]


def _stt_url_candidates(url: str) -> list[str]:
    candidates = _service_url_candidates(url)
    port_alternates = []
    for candidate in candidates:
        if ":8000" in candidate:
            port_alternates.append(candidate.replace(":8000", ":12000", 1))
        if ":12000" in candidate:
            port_alternates.append(candidate.replace(":12000", ":8000", 1))
    for alternate in port_alternates:
        candidates.extend(_service_url_candidates(alternate))
    seen = set()
    return [candidate for candidate in candidates if candidate and not (candidate in seen or seen.add(candidate))]


OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", os.environ.get("CALI_OLLAMA_MODEL_NAME", "qwen2.5:1.5b"))
OLLAMA_FALLBACK_MODEL = os.environ.get("OLLAMA_FALLBACK_MODEL", "llama3.2:1b")
OLLAMA_TIMEOUT_SEC = int(os.environ.get("OLLAMA_TIMEOUT_SEC", "60"))
OLLAMA_NUM_CTX = int(os.environ.get("OLLAMA_NUM_CTX", "1024"))
OLLAMA_NUM_PREDICT = int(os.environ.get("OLLAMA_NUM_PREDICT", "450"))
OLLAMA_TEMPERATURE = float(os.environ.get("OLLAMA_TEMPERATURE", "0.2"))

_RAW_QWEN_TTS_URL = os.environ.get("QWEN_TTS_URL", "")
if ":8000" in _RAW_QWEN_TTS_URL and "/api/kokoro/tts" in _RAW_QWEN_TTS_URL:
    _RAW_QWEN_TTS_URL = ""
QWEN_TTS_URL = _RAW_QWEN_TTS_URL or _default_qwen_tts_url()
KOKORO_TTS_URL = os.environ.get("KOKORO_TTS_URL", _default_kokoro_tts_url())
QWEN_TTS_TIMEOUT_SEC = int(os.environ.get("QWEN_TTS_TIMEOUT_SEC", "220"))
QWEN_TTS_PRIMARY_TIMEOUT_SEC = int(os.environ.get("QWEN_TTS_PRIMARY_TIMEOUT_SEC", "8"))
KOKORO_TTS_TIMEOUT_SEC = int(os.environ.get("KOKORO_TTS_TIMEOUT_SEC", "12"))
SHEP_TTS_TOTAL_TIMEOUT_SEC = float(os.environ.get("SHEP_TTS_TOTAL_TIMEOUT_SEC", "8"))
SHEP_ENABLE_SERVER_TTS = os.environ.get("SHEP_ENABLE_SERVER_TTS", "1").strip().lower() in ("1", "true", "yes", "on")
CALI_KOKORO_VOICE = os.environ.get("QWEN_TTS_VOICE", os.environ.get("CALI_KOKORO_VOICE", "am_adam"))
CALI_KOKORO_SPEED = float(os.environ.get("CALI_KOKORO_SPEED", "1.0"))
SHEP_PREFER_KOKORO = os.environ.get("SHEP_PREFER_KOKORO", "1").strip().lower() in ("1", "true", "yes", "on")
FAST_WHISPER_URL = os.environ.get(
    "FAST_WHISPER_URL",
    os.environ.get("WHISPER_STT_URL", "http://127.0.0.1:9000/stt"),
)
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "tiny")
SHEP_STT_PRIORITY = [
    item.strip().lower()
    for item in os.environ.get("SHEP_STT_PRIORITY", "whisper").split(",")
    if item.strip()
]

DOCTRINE_VERSION = "DOCTRINE_v1.0+B+C+D"
DOCTRINE_CANONICAL_SHA256 = "40ba941c6352ee6c85847ff0bbba689158b2f58d3384972ffdbc9f401dd9b387"
DOCTRINE_STATUS = "SEALED / IMMUTABLE"
DOCTRINE_RATIFIED = "2026-03-05"
DOCTRINE_ENV_PATH = os.environ.get("DOCTRINE_CANONICAL_PATH", "").strip()
_DOCTRINE_CACHE: Optional[Dict[str, Any]] = None

UNKNOWN_FALLBACK_PATTERN = re.compile(r"\[Reference:\s*[0-9a-fA-F-]+\]", re.IGNORECASE)
MORB_COUNT_PATTERN = re.compile(r"\b(2|3|4|5|6|7|8|9|10|11|12|13)\b")
UPSTREAM_TEXT_GARBAGE_MARKERS = (
    "### kaygee governance style:",
    "###.",
    "<think>",
)
ARMS_INGEST_LOCK = asyncio.Lock()


def _sanitize_operator_response(text: str, page_context: str) -> str:
    cleaned = UNKNOWN_FALLBACK_PATTERN.sub("", text or "").strip()
    # Strip Qwen3 think blocks if they leak through
    if "<think>" in cleaned:
        think_end = cleaned.find("</think>")
        if think_end != -1:
            cleaned = cleaned[think_end + len("</think>"):].strip()
        else:
            cleaned = cleaned[:cleaned.find("<think>")].strip()
    lowered = cleaned.lower()
    for marker in UPSTREAM_TEXT_GARBAGE_MARKERS:
        idx = lowered.find(marker)
        if idx >= 0:
            cleaned = cleaned[:idx].strip()
            lowered = cleaned.lower()
    lower = cleaned.lower()
    if "contact us directly" in lower and page_context == "admin":
        return (
            "I do not have a reliable governed answer for that yet. I logged the gap for review, "
            "and I can still help with the next admin step."
        )
    return cleaned


def _doctrine_path_candidates() -> list[Path]:
    candidates: list[Path] = []
    if DOCTRINE_ENV_PATH:
        candidates.append(Path(DOCTRINE_ENV_PATH))
    if _RITI is not None:
        candidates.append(_RITI / "Doctrine_v1.0+B+C+D.txt")
        candidates.append(_RITI / "DOCTRINE_v1.0+B+C+D.txt")
    candidates.append(Path(__file__).resolve().parent / "governance" / "Doctrine_v1.0+B+C+D.txt")
    candidates.append(Path(__file__).resolve().parent.parent / "Renova_te_ipsum" / "Doctrine_v1.0+B+C+D.txt")
    candidates.append(Path(__file__).resolve().parent.parent / "Renova_te_ipsum" / "DOCTRINE_v1.0+B+C+D.txt")
    return candidates


def _load_canonical_doctrine_or_raise() -> Dict[str, Any]:
    global _DOCTRINE_CACHE
    if _DOCTRINE_CACHE is not None:
        return _DOCTRINE_CACHE

    doctrine_path = next((path for path in _doctrine_path_candidates() if path.exists()), None)
    if doctrine_path is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Doctrine enforcement unavailable: canonical doctrine file not found on server. "
                "Set DOCTRINE_CANONICAL_PATH or add Doctrine_v1.0+B+C+D.txt."
            ),
        )

    doctrine_bytes = doctrine_path.read_bytes()
    doctrine_hash = hashlib.sha256(doctrine_bytes).hexdigest()
    if doctrine_hash != DOCTRINE_CANONICAL_SHA256:
        raise HTTPException(
            status_code=503,
            detail=(
                "Doctrine enforcement refused: canonical doctrine hash mismatch "
                f"(expected {DOCTRINE_CANONICAL_SHA256}, got {doctrine_hash})."
            ),
        )

    _DOCTRINE_CACHE = {
        "path": str(doctrine_path),
        "text": doctrine_bytes.decode("utf-8", errors="strict"),
        "hash": doctrine_hash,
        "version": DOCTRINE_VERSION,
        "status": DOCTRINE_STATUS,
        "ratified": DOCTRINE_RATIFIED,
    }
    return _DOCTRINE_CACHE


def _shep_capabilities() -> Dict[str, str]:
    substrate_health = shep_substrate.health()
    return {
        "mesh_data": "available" if (_mesh.available or substrate_health.get("mesh_reachable")) else "unavailable",
        "drive_substrate": "available" if substrate_health.get("substrate_reachable") else "unavailable",
        "r_substrate": "available" if substrate_health.get("substrate_reachable") else "unavailable",
        "morb_launch": "unavailable",
        "morb_list": "unavailable",
        "nft_minting_explainer": "available",
        "nft_minting_action": "available",
        "livestock_data": "available",
        "customer_data": "available",
        "accounting_data": "available",
    }


def build_shep_governance_prompt(context: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
    doctrine = _load_canonical_doctrine_or_raise()
    route = str(context.get("route_path") or "/")
    page_context = str(context.get("page_context") or "general")
    skg_context = context.get("skg_context") or {}
    capabilities = _shep_capabilities()
    renova_preflight = run_renova_preflight(str(context.get("message") or ""), context)
    injected = (
        "You are Shep, the ORB assistant for Shiloh Ridge Farm. Internal cognition core: Renova_te_ipsum.\n"
        "Voice contract: output-only ORB behavior. Route-and-ping contract: navigate, scroll, and point when target exists.\n"
        "Use the provided Ollama tools for navigation and vault lookup; after a tool succeeds, confirm the result naturally in your own words.\n"
        "No fabrication. Never claim unavailable capabilities as connected.\n\n"
        "[DOCTRINE BASELINE]\n"
        f"doctrine_version={doctrine['version']}\n"
        f"doctrine_hash={doctrine['hash']}\n"
        f"doctrine_status={doctrine['status']}\n"
        f"doctrine_ratified={doctrine['ratified']}\n"
        "Raw Reality contract is mandatory.\n"
        "Epistemic Contracts Articles I-VIII are mandatory.\n"
        "DecisionEnvelope is required.\n"
        "Tension Calculus is required.\n"
        "Observer/Auditor awareness is required.\n"
        "Infrastructure Auditor Contract awareness is required.\n"
        "Doctrine Drift Indicator formula: DDR = observed_tension / expected_tension_under_independence.\n"
        "DDR thresholds: DDR > 0.8 Healthy; 0.5 < DDR <= 0.8 Caution; DDR <= 0.5 Critical.\n"
        "Any doctrine deviation requires explicit Article VIII override ID.\n"
        "Canonical epistemic lens order: [\"kant\", \"locke\", \"hume\", \"spinoza\", \"harmonizer\", \"cali\"].\n\n"
        "[MODEL STACK]\n"
        f"primary_model={OLLAMA_MODEL}\n"
        f"fallback_model={OLLAMA_FALLBACK_MODEL}\n\n"
        "[RUNTIME CONTEXT]\n"
        f"route_path={route}\n"
        f"page_context={page_context}\n"
        f"capabilities={capabilities}\n"
        f"renova_preflight={renova_preflight}\n"
        f"skg_context={skg_context}\n"
        "MESH / Drive Substrate / R Substrate awareness required.\n"
        "Morb capability awareness required.\n"
        "NFT minting explainer capability awareness required.\n\n"
        "[CANONICAL DOCTRINE TEXT BEGIN]\n"
        f"{doctrine['text']}\n"
        "[CANONICAL DOCTRINE TEXT END]"
    )
    return injected, doctrine


def _doctrine_integrity_failure_payload(session_id: str, detail: str) -> Dict[str, Any]:
    return _deterministic_diagnostic_fallback(
        session_id=session_id,
        message="",
        page_context="general",
        route_path="/",
        reason="doctrine_integrity_failure",
        blocking_issues=[detail],
        doctrine_integrity_ok=False,
    )


def _known_site_guidance_map() -> Dict[str, Any]:
    return {
        "home": "/",
        "livestock": "/livestock",
        "products": "/products",
        "cart": "/cart",
        "checkout": "/checkout",
        "contact": "/contact",
        "admin_dashboard": "/admin/dashboard",
        "admin_accounting": "/admin/accounting",
        "admin_nft": "/admin/nft",
    }


def _known_route_facts() -> Dict[str, Any]:
    return {
        "nft_routes_exist": True,
        "livestock_routes_exist": True,
        "customer_routes_exist": True,
        "accounting_routes_exist": True,
        "morb_routes_exist": False,
        "mesh_routes_exist": False,
        "drive_substrate_routes_exist": False,
        "r_substrate_routes_exist": False,
    }


def _site_knowledge_rows() -> list[Dict[str, Any]]:
    csv_path = Path(__file__).resolve().parent.parent / "assets" / "shep_farm_knowledge.csv"
    if not csv_path.exists():
        return []
    rows: list[Dict[str, Any]] = []
    with open(csv_path, "r", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            triggers = [trigger.strip().lower() for trigger in (row.get("triggers") or "").split("|") if trigger.strip()]
            suggestions = [suggestion.strip() for suggestion in (row.get("suggestions") or "").split("|") if suggestion.strip()]
            rows.append({**row, "triggers": triggers, "suggestions": suggestions})
    return rows


_SITE_KNOWLEDGE_CACHE: Optional[list[Dict[str, Any]]] = None
_SHEP_WARMUP_STATE: Dict[str, Any] = {
    "started_at": None,
    "completed_at": None,
    "ollama_ready": False,
    "tts_ready": False,
    "tts_engine": None,
    "errors": [],
}


def _match_site_knowledge(message: str) -> Optional[Dict[str, Any]]:
    global _SITE_KNOWLEDGE_CACHE
    if _SITE_KNOWLEDGE_CACHE is None:
        _SITE_KNOWLEDGE_CACHE = _site_knowledge_rows()

    lower = (message or "").lower()
    if not lower.strip():
        return None

    if any(phrase in lower for phrase in ("what can you help", "what can you do", "help me with")):
        return next((row for row in _SITE_KNOWLEDGE_CACHE if row.get("key") == "shep-identity"), None)

    best: Optional[Dict[str, Any]] = None
    best_score = 0
    for row in _SITE_KNOWLEDGE_CACHE:
        for trigger in row.get("triggers", []):
            if trigger and trigger in lower:
                score = len(trigger.split()) * 10 + len(trigger)
                if score > best_score:
                    best = row
                    best_score = score

    if best:
        return best

    if any(word in lower for word in ("help", "start", "navigate", "site")):
        return next((row for row in _SITE_KNOWLEDGE_CACHE if row.get("key") == "shep-identity"), None)
    return None


def _site_knowledge_payload(
    request: AdminOrbChatRequest,
    session_id: str,
    route_path: str,
    match: Dict[str, Any],
) -> Dict[str, Any]:
    response_text = match.get("response") or "I can help with Shiloh Ridge Farm questions, livestock, products, ordering, and contact next steps."
    return {
        "status": "success",
        "response": response_text,
        "response_text": response_text,
        "intent": {"type": "site_knowledge", "key": match.get("key")},
        "metadata": {
            "assistant_name": "Shep",
            "orb_core": "Renova_te_ipsum",
            "system_core": "Renova_te_ipsum",
            "llm_mode": "site_knowledge",
            "knowledge_key": match.get("key"),
            "suggestions": match.get("suggestions", []),
            "page_context": request.page_context,
            "route_path": route_path,
        },
        "audio_wav_base64": None,
        "audio_path": None,
        "voice": None,
        "audio_engine": None,
        "session_id": session_id,
    }


async def _attach_shep_tts(payload: Dict[str, Any], response_text: str) -> Dict[str, Any]:
    if not response_text or not SHEP_ENABLE_SERVER_TTS:
        return payload
    try:
        tts_result = await asyncio.to_thread(_call_shep_tts, response_text, "shep")
    except requests.RequestException as exc:
        logger.warning("Shep TTS unavailable for deterministic response: %s", exc)
        return payload
    payload["audio_wav_base64"] = tts_result.get("audio_wav_base64")
    payload["audio_path"] = tts_result.get("audio_path")
    payload["voice"] = tts_result.get("voice") or CALI_KOKORO_VOICE
    payload["audio_engine"] = tts_result.get("audio_engine") or "qwen-tts"
    payload.setdefault("metadata", {})
    payload["metadata"].update(
        {
            "tts_engine": payload["audio_engine"],
            "tts_endpoint": tts_result.get("tts_endpoint") or QWEN_TTS_URL,
            "tts_provider": tts_result.get("tts_provider") or "qwen",
            "tts_warm_path": "kokoro_male_primary_qwen_backup" if SHEP_PREFER_KOKORO else "qwen_primary_kokoro_backup",
        }
    )
    return payload


async def warmup_shep_stack() -> Dict[str, Any]:
    _SHEP_WARMUP_STATE.update(
        {
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "ollama_ready": False,
            "tts_ready": False,
            "tts_engine": None,
            "errors": [],
        }
    )

    try:
        await asyncio.to_thread(
            _call_ollama,
            "Warm up Shep. Reply with only: ready.",
            "You are Shep. Keep this warm-up response to one word.",
        )
        _SHEP_WARMUP_STATE["ollama_ready"] = True
    except Exception as exc:
        _SHEP_WARMUP_STATE["errors"].append(f"ollama: {exc}")

    try:
        tts_result = await asyncio.to_thread(_call_shep_tts, "Hello. Shep is warming up.", "shep")
        _SHEP_WARMUP_STATE["tts_ready"] = bool(tts_result.get("audio_wav_base64") or tts_result.get("audio_path"))
        _SHEP_WARMUP_STATE["tts_engine"] = tts_result.get("audio_engine")
    except Exception as exc:
        _SHEP_WARMUP_STATE["errors"].append(f"tts: {exc}")

    _SHEP_WARMUP_STATE["completed_at"] = datetime.now(timezone.utc).isoformat()
    return dict(_SHEP_WARMUP_STATE)


@router.get("/shep/warmup")
async def shep_warmup_status():
    return {
        **_SHEP_WARMUP_STATE,
        "primary_llm": OLLAMA_MODEL,
        "fallback_llm": OLLAMA_FALLBACK_MODEL,
        "qwen_tts_url": QWEN_TTS_URL,
        "kokoro_tts_url": KOKORO_TTS_URL,
        "voice_priority": ["qwen-tts", "kokoro-tts"],
    }


@router.post("/shep/warmup")
async def run_shep_warmup():
    return await warmup_shep_stack()


def _is_system_integrity_request(message: str) -> bool:
    lower = (message or "").lower()
    return any(
        phrase in lower
        for phrase in (
            "system integrity",
            "integrity report",
            "overall system status",
            "remaining operational gaps",
            "operational gaps",
            "repair complete",
            "module status",
            "renova status",
        )
    )


def _system_integrity_report_payload(
    session_id: str,
    message: str,
    page_context: str,
    route_path: str,
) -> Dict[str, Any]:
    renova_status = get_renova_status()
    capabilities = _shep_capabilities()
    route_facts = _known_route_facts()
    preflight = run_renova_preflight(message or "system integrity report", {"route_path": route_path})
    cognitive_ready, cognitive_issues = _cognitive_layer_ready(preflight)

    module_flags = {
        "Renova root": renova_status.get("renova_root_found"),
        "ORB controller": renova_status.get("orb_controller_available"),
        "Four-mind tribunal": renova_status.get("four_mind_tribunal_available"),
        "Validation pipeline": renova_status.get("validation_pipeline_available"),
        "Bayesian engine": renova_status.get("bayesian_engine_available"),
        "Vault manager": renova_status.get("vault_manager_available"),
        "HLSF geometry engine": renova_status.get("hlsf_geometry_engine_available"),
        "SF-ORB governance wrapper": renova_status.get("sf_orb_governance_wrapper_available"),
    }
    healthy_modules = [name for name, ok in module_flags.items() if ok]
    blocked_modules = [name for name, ok in module_flags.items() if not ok]

    gaps: list[str] = []
    if blocked_modules:
        gaps.append("Unavailable Renova modules: " + ", ".join(blocked_modules))
    if not cognitive_ready:
        gaps.extend(cognitive_issues)
    for capability, status in capabilities.items():
        if status != "available":
            gaps.append(f"{capability} is {status}")
    for route_name, exists in route_facts.items():
        if not exists:
            gaps.append(f"{route_name} is not connected")
    if not gaps:
        gaps.append("No blocking governed-reasoning gaps detected in local preflight.")

    response_text = (
        "System integrity check is operational. "
        f"Renova modules healthy: {len(healthy_modules)}/{len(module_flags)}. "
        f"Governed cognitive preflight: {'ready' if cognitive_ready else 'blocked'}. "
        "Remaining gaps: " + "; ".join(gaps[:6]) + "."
    )

    return {
        "status": "system_integrity_report",
        "response": response_text,
        "response_text": response_text,
        "intent": {"type": "system_integrity_report"},
        "metadata": {
            "assistant_name": "Shep",
            "orb_core": "Renova_te_ipsum",
            "system_core": "Renova_te_ipsum",
            "renova_status": renova_status,
            "preflight": preflight,
            "cognitive_ready": cognitive_ready,
            "cognitive_issues": cognitive_issues,
            "module_flags": module_flags,
            "capabilities": capabilities,
            "known_route_facts": route_facts,
            "remaining_gaps": gaps,
            "page_context": page_context,
            "route_path": route_path,
            "message_excerpt": (message or "")[:240],
        },
        "audio_wav_base64": None,
        "audio_path": None,
        "voice": None,
        "audio_engine": None,
        "session_id": session_id,
    }


def _deterministic_diagnostic_fallback(
    session_id: str,
    message: str,
    page_context: str,
    route_path: str,
    reason: str,
    blocking_issues: list[str],
    doctrine_integrity_ok: bool,
) -> Dict[str, Any]:
    renova_status = get_renova_status()
    capabilities = _shep_capabilities()
    route_facts = _known_route_facts()
    guidance_map = _known_site_guidance_map()
    response_text = (
        "Shep is in diagnostic fallback. "
        + (
            "Doctrine integrity is blocked, so governed reasoning is locked. "
            if not doctrine_integrity_ok
            else "LLM/governed reasoning is unavailable right now. "
        )
        + "I can still report Renova module status, capabilities, and route guidance safely."
    )
    return {
        "status": "diagnostic_fallback",
        "response": response_text,
        "response_text": response_text,
        "intent": {"type": "renova_diagnostic_fallback"},
        "metadata": {
            "assistant_name": "Shep",
            "orb_core": "Renova_te_ipsum",
            "system_core": "Renova_te_ipsum",
            "diagnostic_fallback": True,
            "fallback_reason": reason,
            "blocking_issues": blocking_issues,
            "doctrine_integrity_ok": doctrine_integrity_ok,
            "doctrine_expected_hash": DOCTRINE_CANONICAL_SHA256,
            "renova_status": renova_status,
            "capabilities": capabilities,
            "known_route_facts": route_facts,
            "known_site_guidance_map": guidance_map,
            "primary_model": OLLAMA_MODEL,
            "fallback_model": OLLAMA_FALLBACK_MODEL,
            "page_context": page_context,
            "route_path": route_path,
            "message_excerpt": (message or "")[:240],
        },
        "session_id": session_id,
        "audio_wav_base64": None,
        "audio_path": None,
        "voice": None,
        "audio_engine": None,
    }


def _is_prime_count(value: int) -> bool:
    if value < 2:
        return False
    if value == 2:
        return True
    if value % 2 == 0:
        return False
    i = 3
    while i * i <= value:
        if value % i == 0:
            return False
        i += 2
    return True


def _extract_requested_morb_count(message: str) -> Optional[int]:
    match = MORB_COUNT_PATTERN.search(message or "")
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


def _is_morb_request(message: str) -> bool:
    lower = (message or "").lower()
    return any(term in lower for term in ("morb", "morbs", "deploy morb", "launch morb"))


def _deterministic_morb_unavailable(
    session_id: str,
    message: str,
    page_context: str,
    route_path: str,
    reason: str,
) -> Dict[str, Any]:
    count = _extract_requested_morb_count(message)
    prime_ok = _is_prime_count(count) if count is not None else None
    return {
        "status": "morb_unavailable",
        "response": "Morb deployment is unavailable because live governed Morb backend controls are not connected yet.",
        "response_text": "Morb deployment is unavailable because live governed Morb backend controls are not connected yet.",
        "intent": {"type": "morb_unavailable"},
        "metadata": {
            "assistant_name": "Shep",
            "orb_core": "Renova_te_ipsum",
            "system_core": "Renova_te_ipsum",
            "diagnostic_fallback": True,
            "fallback_reason": reason,
            "morb_launch_available": _shep_capabilities().get("morb_launch") == "available",
            "requested_morb_count": count,
            "requested_morb_count_is_prime": prime_ok,
            "allowed_prime_counts": [2, 3, 5, 7, 11, 13],
            "known_route_facts": _known_route_facts(),
            "capabilities": _shep_capabilities(),
            "page_context": page_context,
            "route_path": route_path,
            "message_excerpt": (message or "")[:240],
        },
        "session_id": session_id,
        "audio_wav_base64": None,
        "audio_path": None,
        "voice": None,
        "audio_engine": None,
    }


def _cognitive_layer_ready(preflight: Dict[str, Any]) -> tuple[bool, list[str]]:
    status = (preflight or {}).get("status") or {}
    lens = status.get("tribunal_lens_artifacts") or {}
    issues: list[str] = []
    if not status.get("four_mind_tribunal_available"):
        issues.append("FourMindTribunal unavailable")
    if not lens.get("all_required_files_present"):
        issues.append("Required tribunal lens JSON artifacts are missing")
    if not lens.get("all_loaded_in_tribunal"):
        issues.append("Tribunal did not load all required lens payloads")
    sf_orb_control = (preflight or {}).get("sf_orb_control") or {}
    if sf_orb_control.get("status") != "ok":
        issues.append("SFOrbGovernanceWrapper control layer unavailable or failed")
    return (len(issues) == 0), issues


def _build_governed_chat_context(
    request: "AdminOrbChatRequest",
    route_path: str,
    user_type: str,
    username: Optional[str] = None,
) -> Dict[str, Any]:
    context = {
        **(request.context or {}),
        "message": request.message,
        "route_path": route_path,
        "page_context": request.page_context,
        "user_type": user_type,
    }
    if username:
        context["username"] = username
    return context


def _build_governed_system_prompt(
    request: "AdminOrbChatRequest",
    route_path: str,
    user_type: str,
    username: Optional[str] = None,
) -> tuple[str, Dict[str, Any], Dict[str, Any], bool, list[str]]:
    context = _build_governed_chat_context(request, route_path, user_type, username)
    system_prompt, doctrine = build_shep_governance_prompt(context)
    preflight = run_renova_preflight(request.message, context)
    cognitive_ready, cognitive_issues = _cognitive_layer_ready(preflight)
    mode = _derive_cognitive_mode({**context, "cognitive_ready": cognitive_ready})
    return system_prompt, doctrine, {"preflight": preflight, "mode": mode}, cognitive_ready, cognitive_issues


def _governance_metadata(
    doctrine: Dict[str, Any],
    cognitive: Dict[str, Any],
    cognitive_ready: bool,
    cognitive_issues: list[str],
) -> Dict[str, Any]:
    mode = cognitive.get("mode") or {}
    return {
        "cognitive_mode": mode.get("cognitive_mode") or "DIRECT",
        "dominant_mind": mode.get("dominant_mind") or "none",
        "epistemic_shadows": mode.get("epistemic_shadows") or {},
        "renova_preflight": cognitive.get("preflight"),
        "cognitive_ready": cognitive_ready,
        "cognitive_issues": cognitive_issues,
        "doctrine_enforced": True,
        "doctrine_integrity_ok": True,
        "doctrine_version": doctrine.get("version"),
        "doctrine_hash_verified": doctrine.get("hash"),
        "doctrine_path": doctrine.get("path"),
        "doctrine_injected_into_system_prompt": True,
        "doctrine_status": doctrine.get("status"),
        "doctrine_ratified": doctrine.get("ratified"),
    }


class AdminOrbChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1200)
    session_id: Optional[str] = None
    page_context: str = "general"
    context: Dict[str, Any] = Field(default_factory=dict)


class ShepOverrideRequest(BaseModel):
    enabled: bool
    reason: Optional[str] = None


class OrbScriptUpdateRequest(BaseModel):
    section: str
    key: str
    value: Any


class OrbLearningApprovalRequest(BaseModel):
    query_hash: str
    response: str


def _default_orb_admin_state() -> Dict[str, Any]:
    rows = _site_knowledge_rows()
    return {
        "metrics": {
            "total_interactions": 0,
            "successful_responses": 0,
            "learning_opportunities": 0,
        },
        "scripts": {
            "greetings": {
                "default": "I'm Shep, the assistant for Shiloh Ridge Farm.",
                "products": "I can help with farm products and bring Butch in for cut planning.",
                "livestock": "I can help with Katahdin livestock questions and route you to the right listing.",
            },
            "intents": {
                row.get("key") or f"knowledge_{index}": {
                    "response": row.get("response", ""),
                    "triggers": row.get("triggers", []),
                }
                for index, row in enumerate(rows[:12])
            },
        },
        "pending_learning": [],
        "approved_learning": [],
    }


def _load_orb_admin_state() -> Dict[str, Any]:
    default = _default_orb_admin_state()
    if not ORB_ADMIN_STATE_PATH.exists():
        return default
    try:
        saved = json.loads(ORB_ADMIN_STATE_PATH.read_text(encoding="utf-8"))
        return {
            **default,
            **saved,
            "metrics": {**default["metrics"], **saved.get("metrics", {})},
            "scripts": {**default["scripts"], **saved.get("scripts", {})},
        }
    except Exception:
        return default


def _save_orb_admin_state(state: Dict[str, Any]) -> Dict[str, Any]:
    ORB_ADMIN_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    ORB_ADMIN_STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")
    return state


def _load_shep_override() -> Dict[str, Any]:
    default = {
        "enabled": True,
        "reason": None,
        "updated_at": None,
        "updated_by": None,
    }
    if not ORB_OVERRIDE_PATH.exists():
        return default
    try:
        data = json.loads(ORB_OVERRIDE_PATH.read_text(encoding="utf-8"))
        return {**default, **data}
    except Exception:
        return default


def _save_shep_override(enabled: bool, reason: Optional[str], updated_by: str) -> Dict[str, Any]:
    payload = {
        "enabled": enabled,
        "reason": reason,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": updated_by,
    }
    ORB_OVERRIDE_PATH.parent.mkdir(parents=True, exist_ok=True)
    ORB_OVERRIDE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def _shep_shutdown_payload(session_id: str, page_context: str, route_path: str) -> Dict[str, Any]:
    override = _load_shep_override()
    response_text = "Shep is shut down by admin override. Voice, listening, and governed responses are paused."
    return {
        "status": "admin_shutdown",
        "response": response_text,
        "response_text": response_text,
        "intent": {"type": "admin_shutdown"},
        "metadata": {
            "assistant_name": "Shep",
            "orb_core": "Renova_te_ipsum",
            "system_core": "Renova_te_ipsum",
            "admin_override": True,
            "shep_enabled": False,
            "override_reason": override.get("reason"),
            "override_updated_at": override.get("updated_at"),
            "override_updated_by": override.get("updated_by"),
            "page_context": page_context,
            "route_path": route_path,
        },
        "audio_wav_base64": None,
        "audio_path": None,
        "voice": None,
        "audio_engine": None,
        "session_id": session_id,
    }


@router.get("/admin/override")
async def get_shep_override(username: str = Depends(verify_token)):
    return {
        **_load_shep_override(),
        "checked_by": username,
    }


@router.post("/admin/override")
async def set_shep_override(request: ShepOverrideRequest, username: str = Depends(verify_token)):
    return _save_shep_override(request.enabled, request.reason, username)


@router.get("/admin/dashboard")
async def get_orb_admin_dashboard(username: str = Depends(verify_token)):
    state = _load_orb_admin_state()
    rows = _site_knowledge_rows()
    pending_learning = state.get("pending_learning", [])
    approved_learning = state.get("approved_learning", [])
    return {
        "status": "ok",
        "admin_user": username,
        "metrics": {
            **state.get("metrics", {}),
            "successful_responses": max(
                int(state.get("metrics", {}).get("successful_responses", 0)),
                len(rows),
            ),
            "learning_opportunities": len(pending_learning),
        },
        "vault_status": {
            "a_priori_entries": len(rows),
            "a_posteriori_entries": len(approved_learning),
            "unanswered_count": len(pending_learning),
        },
        "scripts": state.get("scripts", {}),
        "pending_learning": pending_learning,
        "improvement_suggestions": [
            {
                "suggestion": (
                    "Production release blocker: turn admin auth bypass off and verify login before final deployment."
                )
            }
        ],
    }


@router.post("/admin/scripts/update")
async def update_orb_admin_script(request: OrbScriptUpdateRequest, username: str = Depends(verify_token)):
    state = _load_orb_admin_state()
    scripts = state.setdefault("scripts", {})
    section = scripts.setdefault(request.section, {})
    section[request.key] = request.value
    state.setdefault("metrics", {})["successful_responses"] = int(
        state.get("metrics", {}).get("successful_responses", 0)
    ) + 1
    _save_orb_admin_state(state)
    return {"status": "ok", "updated_by": username, "section": request.section, "key": request.key}


@router.post("/admin/learning/approve")
async def approve_orb_learning(request: OrbLearningApprovalRequest, username: str = Depends(verify_token)):
    state = _load_orb_admin_state()
    pending = state.setdefault("pending_learning", [])
    state["pending_learning"] = [item for item in pending if item.get("hash") != request.query_hash]
    approved = state.setdefault("approved_learning", [])
    approved.append(
        {
            "hash": request.query_hash,
            "response": request.response,
            "approved_by": username,
            "approved_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    state.setdefault("metrics", {})["learning_opportunities"] = len(state["pending_learning"])
    _save_orb_admin_state(state)
    return {"status": "ok", "approved_by": username, "query_hash": request.query_hash}


@router.post("/speech/transcribe")
async def transcribe_shep_speech(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    return _transcribe_shep_audio(audio_bytes, file.filename, file.content_type)


def _transcribe_with_whisper(audio_bytes: bytes, filename: Optional[str], content_type: Optional[str]) -> Dict[str, Any]:
    last_error = None
    for url in _stt_url_candidates(FAST_WHISPER_URL):
        try:
            response = requests.post(
                url,
                files={
                    "file": (
                        filename or "shep-input.webm",
                        audio_bytes,
                        content_type or "audio/webm",
                    )
                },
                data={"model_name": WHISPER_MODEL},
                timeout=75,
            )
            response.raise_for_status()
            payload = response.json()
            transcript = (
                payload.get("text")
                or payload.get("transcript")
                or (payload.get("result") or {}).get("text")
                or ""
            )
            return {
                "status": "ok",
                "provider": "whisper",
                "endpoint": url,
                "transcript": transcript,
                "result": payload,
            }
        except requests.RequestException as exc:
            last_error = exc
    raise last_error or requests.RequestException("Whisper STT unavailable")


def _transcribe_shep_audio(audio_bytes: bytes, filename: Optional[str], content_type: Optional[str]) -> Dict[str, Any]:
    attempts: list[str] = []
    errors: list[str] = []
    priority = SHEP_STT_PRIORITY or ["whisper"]
    for provider in priority:
        try:
            attempts.append(provider)
            if provider in ("whisper", "fast-whisper", "faster-whisper", "stt"):
                payload = _transcribe_with_whisper(audio_bytes, filename, content_type)
            else:
                continue
            payload["attempts"] = attempts
            payload["errors"] = errors
            return payload
        except requests.RequestException as exc:
            errors.append(f"{provider}: {exc}")

    raise HTTPException(
        status_code=503,
        detail={
            "message": "Shep speech transcription unavailable",
            "attempts": attempts,
            "errors": errors,
            "whisper_endpoint": FAST_WHISPER_URL,
        },
    )


def _run_arms_backup_ingest() -> Dict[str, Any]:
    if not arms_ingest.CSV_SOURCE.exists():
        raise FileNotFoundError(f"Source CSV not found: {arms_ingest.CSV_SOURCE}")

    reports, variable_index = arms_ingest.parse_csv(arms_ingest.CSV_SOURCE)
    domain_block = arms_ingest.build_domain_block(reports, variable_index)
    arms_ingest.update_a_priori_vault(domain_block)
    arms_ingest.write_substrate_archive(domain_block)
    arms_ingest.write_mesh_artifact(domain_block)

    return {
        "csv_source": str(arms_ingest.CSV_SOURCE),
        "a_priori_vault_path": str(arms_ingest.A_PRIORI_PATH),
        "substrate_dir": str(arms_ingest.SUBSTRATE_DIR),
        "promoted_artifact_path": str(
            arms_ingest.PROMOTED_DIR / "farm_economics_arms_variables.json"
        ),
        "variables_ingested": domain_block["total_variables"],
        "reports_covered": domain_block["total_reports"],
    }


def _post_json(url: str, payload: Dict[str, Any], timeout: int = 45) -> Dict[str, Any]:
    response = requests.post(url, json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json()


def _local_read_path(path_value: str) -> Path:
    raw = str(path_value or "").strip()
    if os.name != "nt" and re.match(r"^[A-Za-z]:[\\/]", raw):
        drive = raw[0].lower()
        rest = raw[2:].replace("\\", "/").lstrip("/")
        return Path(f"/mnt/{drive}/{rest}")
    return Path(raw)


def _extract_tts_audio_path(payload: Dict[str, Any]) -> str:
    return str(
        payload.get("audio_path")
        or payload.get("path")
        or payload.get("audio_file")
        or payload.get("output_path")
        or (payload.get("data") or {}).get("audio_path")
        or (payload.get("output") or {}).get("audio_path")
        or ""
    )


def _tts_spoken_excerpt(text: str, max_chars: int = 240) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "")).strip()
    if not cleaned:
        return ""

    max_chars = max(1, int(max_chars))
    if len(cleaned) <= max_chars:
        return cleaned

    minimum_sentence_length = min(40, max_chars)
    sentence_match = re.match(
        rf"^(.{{{minimum_sentence_length},{max_chars}}}?[.!?])(?:\s|$)",
        cleaned,
    )
    if sentence_match:
        return sentence_match.group(1).strip()

    return cleaned[:max_chars].rsplit(" ", 1)[0].strip() or cleaned[:max_chars].strip()

def _call_qwen_tts(text: str, speaker: str = "shep") -> Dict[str, Any]:
    spoken_text = _tts_spoken_excerpt(text)
    qwen_output_path = f"/tmp/shiloh_{speaker}_{uuid.uuid4().hex}.wav"
    qwen_instruct = (
        "A calm, middle-aged male farm assistant voice with a deep, clear, "
        "warm professional tone."
    )
    kokoro_payload = {
        "text": spoken_text,
        "speaker": speaker,
        "voice": CALI_KOKORO_VOICE,
        "format": "wav",
        "sample_rate": 24000,
        "speed": CALI_KOKORO_SPEED,
    }
    last_error = None
    deadline = time.monotonic() + max(1.0, SHEP_TTS_TOTAL_TIMEOUT_SEC)
    primary_url = KOKORO_TTS_URL if SHEP_PREFER_KOKORO else QWEN_TTS_URL
    backup_url = QWEN_TTS_URL if SHEP_PREFER_KOKORO else KOKORO_TTS_URL
    candidates = _tts_url_candidates(primary_url) + _tts_url_candidates(backup_url)
    seen_candidates = []
    for candidate in candidates:
        if candidate and candidate not in seen_candidates:
            seen_candidates.append(candidate)
    for url in seen_candidates:
        try:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            endpoint = url.rstrip("/")
            if endpoint.endswith("/speak"):
                while True:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        raise requests.Timeout("Qwen TTS remained busy until the request deadline")
                    response = requests.post(
                        url,
                        json={"text": spoken_text, "language": "English"},
                        timeout=min(QWEN_TTS_PRIMARY_TIMEOUT_SEC, remaining),
                    )
                    if response.status_code != 503 or remaining <= 2.0:
                        break
                    time.sleep(min(1.25, max(0.1, remaining - 0.5)))
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                if "audio" in content_type:
                    return {
                        "audio_wav_base64": base64.b64encode(response.content).decode("ascii"),
                        "audio_path": None,
                        "voice": CALI_KOKORO_VOICE,
                        "audio_engine": response.headers.get("x-tts-engine") or "qwen3-tts-06b-base",
                        "tts_provider": "qwen",
                        "tts_endpoint": url,
                    }
                data = response.json()
            elif endpoint.endswith("/generate"):
                payload = {
                    "text": spoken_text,
                    "instruct": qwen_instruct,
                    "output_path": qwen_output_path,
                }
                data = _post_json(url, payload, timeout=min(QWEN_TTS_PRIMARY_TIMEOUT_SEC, remaining))
            else:
                payload = kokoro_payload
                data = _post_json(url, payload, timeout=min(KOKORO_TTS_TIMEOUT_SEC, remaining))
            break
        except requests.RequestException as exc:
            last_error = exc
    else:
        raise last_error or requests.RequestException("TTS unavailable before timeout")
    if "data" not in locals():
        raise last_error or requests.RequestException("TTS unavailable before timeout")
    audio_b64 = data.get("audio_wav_base64") or data.get("audio_base64")
    audio_path = _extract_tts_audio_path(data)
    if not audio_b64 and audio_path:
        local_path = _local_read_path(audio_path)
        if local_path.exists():
            audio_b64 = base64.b64encode(local_path.read_bytes()).decode("ascii")
    return {
        "audio_wav_base64": audio_b64,
        "audio_path": audio_path or None,
        "voice": data.get("voice") or CALI_KOKORO_VOICE,
        "audio_engine": data.get("engine") or ("qwen-tts" if url.rstrip("/").endswith("/generate") else "kokoro-tts"),
        "tts_provider": "qwen" if url.rstrip("/").endswith("/generate") else "kokoro",
        "tts_endpoint": url,
    }


def _call_shep_tts(text: str, speaker: str = "shep") -> Dict[str, Any]:
    return _call_qwen_tts(text, speaker)



_SITE_NAVIGATION_PATHS = [
    "/", "/about", "/auctions", "/cart", "/checkout", "/contact", "/katahdin",
    "/livestock", "/products", "/admin/dashboard", "/admin/accounting", "/admin/analytics",
    "/admin/about", "/admin/blog", "/admin/butch", "/admin/contacts", "/admin/customers",
    "/admin/farm-pricing", "/admin/inventory", "/admin/livestock", "/admin/nft", "/admin/orders",
    "/admin/products", "/admin/review-queue", "/admin/sales", "/admin/settings",
]

_OLLAMA_SITE_TOOL = {
    "type": "function",
    "function": {
        "name": "orb_site_navigate",
        "description": "Use this for every request to go, open, show, visit, or move to a page on the current Shiloh Ridge website. It navigates, then points and pings the page target.",
        "parameters": {
            "type": "object",
            "properties": {"path": {"type": "string", "enum": _SITE_NAVIGATION_PATHS}},
            "required": ["path"],
        },
    },
}

_OLLAMA_SUBSTRATE_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "substrate_search",
        "description": "Search farm records for factual questions. Never use this tool when the user is asking to navigate to a website page.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 8},
            },
            "required": ["query"],
        },
    },
}

_LLM_TOOL_AUDIT_PATH = Path(os.environ.get("SHILOH_VAULT_SYSTEM_ROOT", "/app/vault_system")) / "shep" / "tool_calls.jsonl"


def _audit_llm_tool_call(record: Dict[str, Any]) -> None:
    try:
        _LLM_TOOL_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _LLM_TOOL_AUDIT_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"timestamp": datetime.now(timezone.utc).isoformat(), **record}, default=str) + "\n")
    except OSError as exc:
        logger.warning("Could not persist Shep tool audit: %s", exc)


def _execute_llm_tool(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    if name == "orb_site_navigate":
        path = str(arguments.get("path") or "")
        if path not in _SITE_NAVIGATION_PATHS:
            return {"ok": False, "error": "The requested site route is not allow-listed."}
        pointer_result = call_tool("farm_orb.pointer_lookup", {"query": path.rsplit("/", 1)[-1] or "home", "page_route": path, "limit": 3})
        return {"ok": True, "status": "ready", "path": path, "pointer_map": pointer_result.get("result")}
    if name == "substrate_search":
        return call_tool(
            "substrate.search",
            {"query": str(arguments.get("query") or ""), "limit": min(int(arguments.get("limit") or 5), 8)},
        )
    return {"ok": False, "error": f"Unknown or unauthorized Shep tool: {name}"}


def _call_ollama(prompt: str, system: str = "") -> Dict[str, Any]:
    active_model = OLLAMA_MODEL
    endpoint = f"{OLLAMA_BASE_URL.rstrip('/')}/api/chat"
    messages: list[Dict[str, Any]] = []
    tool_policy = (
        "Tool policy: when the user asks to go, open, show, visit, or move to a site page, "
        "you must call orb_site_navigate and must not call substrate_search. Use "
        "substrate_search only for factual record retrieval. After a successful tool result, "
        "respond with a short, natural confirmation in your own words."
    )
    messages.append({"role": "system", "content": f"{system.strip()}\n\n{tool_policy}".strip()})
    messages.append({"role": "user", "content": prompt.strip()})
    tools = [_OLLAMA_SITE_TOOL, _OLLAMA_SUBSTRATE_SEARCH_TOOL]
    completed_tool_calls: list[Dict[str, Any]] = []

    def _send(model: str, include_tools: bool = True) -> requests.Response:
        options = {
            "num_ctx": OLLAMA_NUM_CTX if include_tools else min(OLLAMA_NUM_CTX, 1024),
            "temperature": OLLAMA_TEMPERATURE,
            "num_predict": OLLAMA_NUM_PREDICT if include_tools else min(OLLAMA_NUM_PREDICT, 48),
        }
        payload: Dict[str, Any] = {
            "model": model,
            "stream": False,
            "keep_alive": "30m",
            "messages": messages,
            "options": options,
        }
        if include_tools:
            payload["tools"] = tools
        return requests.post(
            endpoint,
            json=payload,
            timeout=OLLAMA_TIMEOUT_SEC,
        )

    response = _send(active_model)
    if response.status_code == 404 and OLLAMA_FALLBACK_MODEL and OLLAMA_FALLBACK_MODEL != active_model:
        active_model = OLLAMA_FALLBACK_MODEL
        response = _send(active_model)
    response.raise_for_status()
    data = response.json()

    for _round in range(1):
        assistant_message = data.get("message") or {}
        requested_calls = assistant_message.get("tool_calls") or []
        if not requested_calls:
            break
        messages.append(assistant_message)
        for requested in requested_calls[:3]:
            function = requested.get("function") or {}
            name = str(function.get("name") or "")
            arguments = function.get("arguments") or {}
            if isinstance(arguments, str):
                try:
                    arguments = json.loads(arguments)
                except json.JSONDecodeError:
                    arguments = {}
            result = _execute_llm_tool(name, arguments)
            record = {"name": name, "arguments": arguments, "result": result}
            completed_tool_calls.append(record)
            _audit_llm_tool_call(record)
            if name == "orb_site_navigate":
                model_result = {
                    "ok": result.get("ok"),
                    "status": result.get("status"),
                    "path": result.get("path"),
                    "pointer_available": bool(result.get("pointer_map")),
                }
            else:
                model_result = result
            messages.append({"role": "tool", "tool_name": name, "content": json.dumps(model_result, default=str)[:1800]})
        response = _send(active_model, include_tools=False)
        response.raise_for_status()
        data = response.json()

    content = (data.get("message") or {}).get("content") or data.get("response") or ""
    intent_type = "tool_navigation" if any(call.get("name") == "orb_site_navigate" for call in completed_tool_calls) else "admin"
    return {
        "status": "success",
        "response": content,
        "response_text": content,
        "intent": {"type": intent_type},
        "tool_calls": completed_tool_calls,
        "metadata": {"confidence": 0.9, "model": active_model},
    }


def _build_primary_admin_prompt(
    request: AdminOrbChatRequest,
    username: str,
) -> str:
    return (
        f"Admin user: {username}\n"
        f"Route: {str((request.context or {}).get('route_path') or '/admin')}\n"
        f"Page context: {request.page_context}\n"
        f"Admin request: {request.message}"
    )


_CALI_SYSTEM_PROMPT = (
    "You are Shep, the custom website ORB assistant for Shiloh Ridge Farm. "
    "Your operating ORB core is Renova_te_ipsum, with CALI-compatible admin tooling underneath. "
    "Be curious and self-directed in reasoning, but stay out of the operator's way. "
    "Only ask one brief clarifying question when it materially improves the outcome; otherwise act directly. "
    "Keep a calm autonomous tone without dominating the interaction. "
    "Reply directly to the admin request in concise natural language. "
    "Focus on practical workflow help and one clear next step when useful. "
    "Do not return navigation labels or placeholder page summaries. "
    "Keep responses short — 2 to 4 sentences maximum. "
    "Do not use think blocks or show internal reasoning."
)

_SHEP_SITE_SYSTEM_PROMPT = (
    "You are Shep, the custom website ORB assistant for Shiloh Ridge Farm. "
    "You are powered by the Renova_te_ipsum ORB core, the WSL GPU Ollama stack, Qwen TTS, and WSL faster-whisper speech recognition. "
    "Be curious and observant, but remain unobtrusive and out of the visitor's way. "
    "Project autonomous, self-determined assistance without being pushy. "
    "Ask at most one short clarifying question only when needed for accuracy. "
    "Help visitors with farm navigation, livestock questions, Katahdin basics, product questions, ordering guidance, and contact next steps. "
    "When questions are specifically about meat cuts, freezer planning, product pricing, or order parsing, explain that Butch is the ranch hand and butcher specialist for that topic. "
    "Keep responses concise, practical, and friendly. Do not claim to be CALI by name unless explaining the internal compatibility layer."
)


def _build_repair_admin_prompt(
    request: AdminOrbChatRequest,
    username: str,
) -> str:
    return (
        f"Admin user: {username}\n"
        f"Request: {request.message}\n\n"
        "Respond in exactly 2 short sentences: "
        "first a direct answer, then one concrete next step."
    )


def _derive_cognitive_mode(stimulus: Dict[str, Any]) -> Dict[str, Any]:
    message = str(stimulus.get("message") or "").lower()
    record_terms = ("animal", "sheep", "lamb", "tag", "register", "registration", "registry", "pedigree", "sire", "dam", "lambing", "birth type", "breeding type", "genotype", "treatment", "health record", "weight", "inspection", "coat type", "owner", "transfer", "sale", "customer", "document", "certificate")
    action_terms = ("change", "update", "delete", "create", "submit", "approve", "sign", "transfer ownership", "mark resolved", "scan")
    escalation_terms = ("human", "escalate", "disagree", "conflict", "contradict", "which one is correct", "legal", "signature", "approval")
    ocr_terms = ("ocr", "scan this", "no text", "read this image", "read this certificate")
    if not stimulus.get("cognitive_ready", True) or any(term in message for term in escalation_terms):
        mode, mind = "ESCALATE", "kant"
    elif any(term in message for term in ocr_terms):
        mode, mind = "OCR", "locke"
    elif any(term in message for term in action_terms):
        mode, mind = "TOOL", "kant"
    elif any(term in message for term in record_terms):
        mode, mind = "RETRIEVAL", "locke"
    else:
        mode, mind = "DIRECT", "none"
    return {"cognitive_mode": mode, "dominant_mind": mind, "epistemic_shadows": {}, "selector": "shep_dynamic_v1"}


def _requires_grounded_retrieval(message: str) -> bool:
    return _derive_cognitive_mode({"message": message}).get("cognitive_mode") in {"RETRIEVAL", "OCR", "ESCALATE", "TOOL"}


async def _grounded_site_response(request: AdminOrbChatRequest, session_id: str, route_path: str) -> Optional[Dict[str, Any]]:
    mode = _derive_cognitive_mode({"message": request.message})["cognitive_mode"]
    if not _requires_grounded_retrieval(request.message):
        return None
    request_id = f"shep_{uuid.uuid4().hex[:12]}"
    tool_calls: list[Dict[str, Any]] = []
    evidence: list[Dict[str, Any]] = []
    warnings: list[str] = []
    escalation = None

    if mode == "OCR":
        answer = "I need an administrator to select the exact source and page before I run OCR."
        warnings.append("OCR requires a specific indexed source and administrator authorization.")
    else:
        search_result = await asyncio.to_thread(call_tool, "substrate.search", {"query": request.message, "limit": 5})
        tool_calls.append({"tool": "substrate.search", "status": "completed", "summary": "Searched the R-drive substrate"})
        matches = (search_result.get("result") or {}).get("results", [])
        evidence = [item["pointer"] for item in matches]
        if matches:
            excerpts = " ".join(item["excerpt"].replace("\n", " ") for item in matches[:2])[:1000]
            answer = f"I found supporting source material: {excerpts}"
        else:
            answer = "I could not verify that from the currently indexed farm substrate."
            warnings.append("No matching evidence was found; no farm fact was inferred.")

    should_escalate = mode == "ESCALATE" or any(term in request.message.lower() for term in ("change", "update", "delete", "registered owner", "sign", "approve"))
    if should_escalate:
        try:
            escalation = await asyncio.to_thread(shep_substrate.create_escalation, {"conversation_id": session_id, "request_id": request_id, "user_request": request.message, "interpreted_intent": mode, "reason": "Human judgment, approval, conflict resolution, or permanent-record authority is required.", "confidence": max((item.get("confidence", 0.0) for item in evidence), default=0.0), "evidence": evidence, "attempted_tool_calls": tool_calls, "recommended_human_action": "Review the evidence and approve, correct, or reject the requested action."})
            tool_calls.append({"tool": "escalation.create", "status": "completed", "summary": "Created human review"})
            answer += f" I created human review {escalation['escalation_id']}."
        except Exception as exc:
            warnings.append(f"Escalation persistence failed: {exc}")
            answer += " I could not persist the human review request."

    payload = {"status": "success", "answer": answer, "response": answer, "response_text": answer, "request_id": request_id, "cognitive_mode": mode, "governance_status": "governed", "tool_calls": tool_calls, "tool_results": [], "evidence": evidence, "confidence": max((item.get("confidence", 0.0) for item in evidence), default=0.0), "substrate_status": shep_substrate.health().get("status"), "scan_status": shep_substrate.scan_status(), "warnings": warnings, "missing_data_notices": warnings, "escalation": escalation, "intent": {"type": "grounded_substrate"}, "metadata": {"assistant_name": "Shep", "orb_core": "Renova_te_ipsum", "cognitive_mode": mode, "evidence_count": len(evidence)}, "audio_wav_base64": None, "audio_path": None, "voice": None, "audio_engine": None, "session_id": session_id}
    return await _attach_shep_tts(payload, answer)


@router.get("/governance/status")
async def orb_governance_status():
    status = get_renova_status()
    return {
        "status": "ok",
        **status,
    }


@router.post("/chat")
async def chat_with_cali(request: AdminOrbChatRequest, username: str = Depends(verify_token)):
    session_id = request.session_id or f"shep_admin_{uuid.uuid4().hex[:10]}"
    no_fallback = bool((request.context or {}).get("no_fallback"))

    user_prompt = _build_primary_admin_prompt(request, username)

    llm_mode = "ollama"
    llm_endpoint = f"{OLLAMA_BASE_URL}/api/chat"
    used_repair_prompt = False
    route_path = str((request.context or {}).get("route_path") or "/admin")

    if not _load_shep_override().get("enabled", True):
        return _shep_shutdown_payload(session_id, request.page_context, route_path)

    if _is_morb_request(request.message) and _shep_capabilities().get("morb_launch") != "available":
        return _deterministic_morb_unavailable(
            session_id=session_id,
            message=request.message,
            page_context=request.page_context,
            route_path=route_path,
            reason="morb_launch_capability_unavailable",
        )
    if _is_system_integrity_request(request.message):
        return _system_integrity_report_payload(
            session_id=session_id,
            message=request.message,
            page_context=request.page_context,
            route_path=route_path,
        )
    try:
        enforced_system_prompt, doctrine, cognitive, cognitive_ready, cognitive_issues = _build_governed_system_prompt(
            request,
            route_path,
            "admin",
            username,
        )
    except HTTPException as exc:
        return _deterministic_diagnostic_fallback(
            session_id=session_id,
            message=request.message,
            page_context=request.page_context,
            route_path=route_path,
            reason="doctrine_integrity_failure",
            blocking_issues=[str(exc.detail)],
            doctrine_integrity_ok=False,
        )

    try:
        cali_result = await asyncio.to_thread(_call_ollama, user_prompt, enforced_system_prompt)
    except requests.RequestException as exc:
        if no_fallback:
            return _deterministic_diagnostic_fallback(
                session_id=session_id,
                message=request.message,
                page_context=request.page_context,
                route_path=str((request.context or {}).get("route_path") or "/admin"),
                reason="llm_unavailable_require_upstream_llm",
                blocking_issues=[f"Ollama unavailable: {exc}"],
                doctrine_integrity_ok=True,
            )
        llm_mode = "local_orb_core_fallback"
        try:
            local_result = await _local_orb_core.process_message(
                request.message,
                session_id=session_id,
                page_context=request.page_context,
            )
            cali_result = {
                "status": "success",
                "response": local_result.get("response"),
                "response_text": local_result.get("response_text"),
                "intent": {"type": local_result.get("intent", "admin")},
                "metadata": {
                    "confidence": local_result.get("confidence"),
                    "mesh_connected": local_result.get("mesh_connected", False),
                },
            }
        except Exception as fallback_exc:
            raise HTTPException(status_code=502, detail="Shep ORB service is unavailable") from fallback_exc

    response_text = cali_result.get("response_text") or cali_result.get("response") or ""
    response_text = _sanitize_operator_response(response_text, request.page_context)

    # If Ollama returned an empty response, retry with a repair prompt
    if not response_text.strip():
        try:
            used_repair_prompt = True
            repair_result = await asyncio.to_thread(
                _call_ollama,
                _build_repair_admin_prompt(request, username),
                enforced_system_prompt,
            )
            response_text = repair_result.get("response_text") or repair_result.get("response") or ""
            response_text = _sanitize_operator_response(response_text, request.page_context)
            cali_result = repair_result
        except requests.RequestException as exc:
            logger.warning("Ollama repair prompt also failed: %s", exc)

    audio_wav_base64 = None
    audio_path = None
    voice = None
    audio_engine = None
    tts_metadata: Dict[str, Any] = {}

    if response_text and SHEP_ENABLE_SERVER_TTS:
        try:
            tts_result = await asyncio.to_thread(_call_shep_tts, response_text, "shep")
            audio_wav_base64 = tts_result.get("audio_wav_base64")
            audio_path = tts_result.get("audio_path")
            voice = tts_result.get("voice") or CALI_KOKORO_VOICE
            audio_engine = tts_result.get("audio_engine") or "qwen-tts"
            tts_metadata = {
                "tts_engine": audio_engine,
                "tts_endpoint": tts_result.get("tts_endpoint") or QWEN_TTS_URL,
                "tts_provider": tts_result.get("tts_provider") or "qwen",
            }
        except requests.RequestException as exc:
            logger.warning("Shep Qwen TTS unavailable: %s", exc)

    try:
        _mesh.export_interaction_insight(
            query=request.message,
            response=response_text,
            intent=str((cali_result.get("intent") or {}).get("type") or "admin"),
            confidence=float(
                (cali_result.get("metadata") or {}).get("confidence") or 0.85
            ),
        )
    except Exception:
        pass

    return {
        "status": cali_result.get("status", "success"),
        "response": cali_result.get("response"),
        "response_text": response_text,
        "intent": cali_result.get("intent"),
        "tool_calls": cali_result.get("tool_calls", []),
        "metadata": {
            **cali_result.get("metadata", {}),
            "assistant_name": "Shep",
            "orb_core": "Renova_te_ipsum",
            "system_core": "Renova_te_ipsum",
            "mesh_connected": _mesh.available,
            **_governance_metadata(doctrine, cognitive, cognitive_ready, cognitive_issues),
            "llm_mode": llm_mode,
            "llm_endpoint": llm_endpoint,
            "llm_model": (cali_result.get("metadata") or {}).get("model") or OLLAMA_MODEL,
            "llm_voice_mode": "ollama",
            "llm_voice_endpoint": None,
            "tts_engine": tts_metadata.get("tts_engine") or audio_engine,
            "tts_endpoint": tts_metadata.get("tts_endpoint"),
            "tts_provider": tts_metadata.get("tts_provider"),
            "whisper_endpoint": FAST_WHISPER_URL,
            "stt_priority": SHEP_STT_PRIORITY,
            "used_repair_prompt": used_repair_prompt,
            "primary_model": OLLAMA_MODEL,
            "fallback_model": OLLAMA_FALLBACK_MODEL,
            "capabilities": _shep_capabilities(),
        },
        "audio_wav_base64": audio_wav_base64,
        "audio_path": audio_path,
        "voice": voice,
        "audio_engine": audio_engine,
        "session_id": session_id,
    }


@router.post("/site-chat")
async def chat_with_shep_site_orb(request: AdminOrbChatRequest):
    session_id = request.session_id or f"shep_site_{uuid.uuid4().hex[:10]}"

    prompt = (
        f"Route: {str((request.context or {}).get('route_path') or '/')}\n"
        f"Page context: {request.page_context}\n"
        f"Visitor request: {request.message}"
    )

    route_path = str((request.context or {}).get("route_path") or "/")

    if not _load_shep_override().get("enabled", True):
        return _shep_shutdown_payload(session_id, request.page_context, route_path)

    if _is_morb_request(request.message) and _shep_capabilities().get("morb_launch") != "available":
        return _deterministic_morb_unavailable(
            session_id=session_id,
            message=request.message,
            page_context=request.page_context,
            route_path=route_path,
            reason="morb_launch_capability_unavailable",
        )
    if _is_system_integrity_request(request.message):
        return _system_integrity_report_payload(
            session_id=session_id,
            message=request.message,
            page_context=request.page_context,
            route_path=route_path,
        )
    grounded = await _grounded_site_response(request, session_id, route_path)
    if grounded is not None:
        return grounded
    if (request.message or "").strip().lower() == "quick status refresh for this page.":
        match = _match_site_knowledge("hello")
        if match:
            payload = _site_knowledge_payload(request, session_id, route_path, match)
            return await _attach_shep_tts(payload, payload.get("response_text") or "")
    site_knowledge = _match_site_knowledge(request.message)
    if site_knowledge:
        payload = _site_knowledge_payload(request, session_id, route_path, site_knowledge)
        return await _attach_shep_tts(payload, payload.get("response_text") or "")

    try:
        enforced_system_prompt, doctrine, cognitive, cognitive_ready, cognitive_issues = _build_governed_system_prompt(
            request,
            route_path,
            "site_visitor",
        )
    except HTTPException as exc:
        return _deterministic_diagnostic_fallback(
            session_id=session_id,
            message=request.message,
            page_context=request.page_context,
            route_path=route_path,
            reason="doctrine_integrity_failure",
            blocking_issues=[str(exc.detail)],
            doctrine_integrity_ok=False,
        )

    llm_mode = "ollama"
    llm_endpoint = f"{OLLAMA_BASE_URL}/api/chat"
    try:
        shep_result = await asyncio.to_thread(_call_ollama, prompt, enforced_system_prompt)
    except requests.RequestException as exc:
        response_text = "I am here, but the local model is taking too long. Please try again."
        audio_wav_base64 = None
        audio_path = None
        voice = None
        audio_engine = None

        try:
            tts_result = await asyncio.to_thread(_call_shep_tts, response_text, "shep")
            audio_wav_base64 = tts_result.get("audio_wav_base64")
            audio_path = tts_result.get("audio_path")
            voice = tts_result.get("voice")
            audio_engine = tts_result.get("audio_engine")
        except requests.RequestException:
            pass

        return {
            "status": "success",
            "response": response_text,
            "response_text": response_text,
            "intent": {"type": "llm_timeout"},
            "metadata": {
                "llm_mode": "direct_timeout",
                "llm_model": OLLAMA_MODEL,
                "error": str(exc),
            },
            "audio_wav_base64": audio_wav_base64,
            "audio_path": audio_path,
            "voice": voice,
            "audio_engine": audio_engine,
            "session_id": session_id,
        }

    response_text = shep_result.get("response_text") or shep_result.get("response") or "Shep is online."
    response_text = _sanitize_operator_response(response_text, request.page_context)

    audio_wav_base64 = None
    audio_path = None
    voice = None
    audio_engine = None
    tts_metadata: Dict[str, Any] = {}

    if response_text and SHEP_ENABLE_SERVER_TTS:
        try:
            tts_result = await asyncio.to_thread(_call_shep_tts, response_text, "shep")
            audio_wav_base64 = tts_result.get("audio_wav_base64")
            audio_path = tts_result.get("audio_path")
            voice = tts_result.get("voice") or CALI_KOKORO_VOICE
            audio_engine = tts_result.get("audio_engine") or "qwen-tts"
            tts_metadata = {
                "tts_engine": audio_engine,
                "tts_endpoint": tts_result.get("tts_endpoint") or QWEN_TTS_URL,
                "tts_provider": tts_result.get("tts_provider") or "qwen",
            }
        except requests.RequestException as exc:
            logger.warning("Shep Qwen TTS unavailable: %s", exc)

    return {
        "status": shep_result.get("status", "success"),
        "response": response_text,
        "response_text": response_text,
        "intent": shep_result.get("intent"),
        "tool_calls": shep_result.get("tool_calls", []),
        "metadata": {
            **shep_result.get("metadata", {}),
            "assistant_name": "Shep",
            "orb_core": "Renova_te_ipsum",
            "system_core": "Renova_te_ipsum",
            "mesh_connected": _mesh.available,
            **_governance_metadata(doctrine, cognitive, cognitive_ready, cognitive_issues),
            "llm_mode": llm_mode,
            "llm_endpoint": llm_endpoint,
            "llm_model": (shep_result.get("metadata") or {}).get("model") or OLLAMA_MODEL,
            "tts_engine": tts_metadata.get("tts_engine") or audio_engine,
            "tts_endpoint": tts_metadata.get("tts_endpoint"),
            "tts_provider": tts_metadata.get("tts_provider"),
            "whisper_endpoint": FAST_WHISPER_URL,
            "stt_priority": SHEP_STT_PRIORITY,
            "primary_model": OLLAMA_MODEL,
            "fallback_model": OLLAMA_FALLBACK_MODEL,
            "capabilities": _shep_capabilities(),
        },
        "audio_wav_base64": audio_wav_base64,
        "audio_path": audio_path,
        "voice": voice,
        "audio_engine": audio_engine,
        "session_id": session_id,
    }


@router.post("/backup/ingest-arms")
async def ingest_arms_backup(username: str = Depends(verify_token)):
    if ARMS_INGEST_LOCK.locked():
        return {
            "status": "busy",
            "message": "ARMS backup ingest is already running.",
        }

    async with ARMS_INGEST_LOCK:
        try:
            result = await asyncio.to_thread(_run_arms_backup_ingest)
            logger.info(
                "ARMS backup ingest completed by admin user '%s' with %s variables",
                username,
                result.get("variables_ingested"),
            )
            return {
                "status": "success",
                "message": "ARMS backup ingest complete.",
                "result": result,
            }
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except Exception as exc:
            logger.exception("ARMS backup ingest failed: %s", exc)
            raise HTTPException(
                status_code=500,
                detail="ARMS backup ingest failed. Check backend logs.",
            ) from exc
