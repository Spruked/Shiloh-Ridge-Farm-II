import asyncio
import logging
import os
import re
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import verify_token
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

try:
    from core_4_minds.tribunal import FourMindTribunal
    _tribunal = FourMindTribunal()
    logger.info("FourMindTribunal loaded from live Renova_te_ipsum")
except ImportError as exc:
    logger.error("FourMindTribunal FAILED — check volume mount: %s", exc)
    _tribunal = None

# Cognitive mode colours match the PySide6 FloatingOrb palette
_MIND_TO_MODE: Dict[str, str] = {
    "kant":    "GUARD",
    "hume":    "HABIT",
    "spinoza": "INTUITION_JUMP",
    "locke":   "EMPIRICAL",
}

_mesh = MeshBridge()
_local_orb_core = OrbCore()

router = APIRouter(prefix="/orb", tags=["Shiloh Ridge Custom ORB"])

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", os.environ.get("CALI_OLLAMA_MODEL_NAME", "qwen2.5:3b"))
OLLAMA_TIMEOUT_SEC = int(os.environ.get("OLLAMA_TIMEOUT_SEC", "45"))

KOKORO_TTS_URL = os.environ.get(
    "QWEN_TTS_URL",
    os.environ.get("KOKORO_TTS_URL", "http://host.docker.internal:8000/api/kokoro/tts"),
)
CALI_KOKORO_VOICE = os.environ.get("QWEN_TTS_VOICE", os.environ.get("CALI_KOKORO_VOICE", "qwen3"))
CALI_KOKORO_SPEED = float(os.environ.get("CALI_KOKORO_SPEED", "1.0"))
CALI_CPP_VERSION = os.environ.get("CALI_CPP_VERSION", "3.0")

UNKNOWN_FALLBACK_PATTERN = re.compile(r"\[Reference:\s*[0-9a-fA-F-]+\]", re.IGNORECASE)
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
            "Dominic no matter how sexy you are I just don't have an answer for you at the moment. I logged it for CALI learning, "
            "and I can still help with the next admin step now.  If you want I can tell you you are sexy again"        )
    return cleaned


class AdminOrbChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1200)
    session_id: Optional[str] = None
    page_context: str = "general"
    context: Dict[str, Any] = Field(default_factory=dict)


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


def _call_ollama(prompt: str, system: str = "") -> Dict[str, Any]:
    url = f"{OLLAMA_BASE_URL}/api/chat"
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    response = requests.post(
        url,
        json={"model": OLLAMA_MODEL, "messages": messages, "stream": False},
        timeout=OLLAMA_TIMEOUT_SEC,
    )
    response.raise_for_status()
    data = response.json()
    content = (data.get("message") or {}).get("content") or ""
    return {
        "status": "success",
        "response": content,
        "response_text": content,
        "intent": {"type": "admin"},
        "metadata": {"confidence": 0.9, "model": OLLAMA_MODEL},
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
    "Reply directly to the admin request in concise natural language. "
    "Focus on practical workflow help and one clear next step when useful. "
    "Do not return navigation labels or placeholder page summaries. "
    "Keep responses short — 2 to 4 sentences maximum. "
    "Do not use think blocks or show internal reasoning."
)

_SHEP_SITE_SYSTEM_PROMPT = (
    "You are Shep, the custom website ORB assistant for Shiloh Ridge Farm. "
    "You are powered by the Renova_te_ipsum ORB core, Qwen 2.5 3B, Qwen 3 TTS, and the CP 3.0 cochlear processor. "
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
    if _tribunal is None:
        return {"cognitive_mode": "GUARD", "dominant_mind": "kant", "epistemic_shadows": {}}

    try:
        shadows = _tribunal.generate_epistemic_shadow(stimulus)
        dominant_mind = max(shadows, key=lambda k: shadows[k]["confidence"])
        cognitive_mode = _MIND_TO_MODE.get(dominant_mind, "GUARD")
        return {
            "cognitive_mode": cognitive_mode,
            "dominant_mind": dominant_mind,
            "epistemic_shadows": shadows,
        }
    except Exception as exc:
        logger.warning("Tribunal shadow generation failed: %s", exc)
        return {"cognitive_mode": "GUARD", "dominant_mind": "kant", "epistemic_shadows": {}}


@router.post("/chat")
async def chat_with_cali(request: AdminOrbChatRequest, username: str = Depends(verify_token)):
    session_id = request.session_id or f"shep_admin_{uuid.uuid4().hex[:10]}"
    no_fallback = bool((request.context or {}).get("no_fallback"))

    stimulus = {
        "message": request.message,
        "page_context": request.page_context,
        "session_id": session_id,
        "assistant": "Shep",
        "core": "Renova_te_ipsum",
    }
    cognitive = _derive_cognitive_mode(stimulus)

    user_prompt = _build_primary_admin_prompt(request, username)

    llm_mode = "ollama"
    llm_endpoint = f"{OLLAMA_BASE_URL}/api/chat"
    used_repair_prompt = False

    try:
        cali_result = await asyncio.to_thread(_call_ollama, user_prompt, _CALI_SYSTEM_PROMPT)
    except requests.RequestException as exc:
        if no_fallback:
            raise HTTPException(status_code=502, detail=f"Ollama LLM unavailable: {exc}") from exc
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
                _CALI_SYSTEM_PROMPT,
            )
            response_text = repair_result.get("response_text") or repair_result.get("response") or ""
            response_text = _sanitize_operator_response(response_text, request.page_context)
            cali_result = repair_result
        except requests.RequestException as exc:
            logger.warning("Ollama repair prompt also failed: %s", exc)

    audio_wav_base64 = None
    voice = None
    audio_engine = None

    if response_text:
        tts_payload = {
            "text": response_text,
            "voice": CALI_KOKORO_VOICE,
            "speed": CALI_KOKORO_SPEED,
        }
        try:
            tts_result = await asyncio.to_thread(_post_json, KOKORO_TTS_URL, tts_payload)
            audio_wav_base64 = tts_result.get("audio_wav_base64")
            voice = tts_result.get("voice") or CALI_KOKORO_VOICE
            audio_engine = "qwen3-tts"
        except requests.RequestException as exc:
            logger.warning("Shep Qwen TTS fallback engaged: %s", exc)

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
        "metadata": {
            **cali_result.get("metadata", {}),
            "assistant_name": "Shep",
            "orb_core": "Renova_te_ipsum",
            "system_core": "Renova_te_ipsum",
            "mesh_connected": _mesh.available,
            "cognitive_mode": cognitive["cognitive_mode"],
            "dominant_mind": cognitive["dominant_mind"],
            "epistemic_shadows": cognitive["epistemic_shadows"],
            "llm_mode": llm_mode,
            "llm_endpoint": llm_endpoint,
            "llm_model": OLLAMA_MODEL,
            "llm_voice_mode": "ollama",
            "llm_voice_endpoint": None,
            "tts_engine": "qwen3-tts",
            "cochlear_processor": CALI_CPP_VERSION,
            "cpp_version": CALI_CPP_VERSION,
            "used_repair_prompt": used_repair_prompt,
        },
        "audio_wav_base64": audio_wav_base64,
        "voice": voice,
        "audio_engine": audio_engine,
        "session_id": session_id,
    }


@router.post("/site-chat")
async def chat_with_shep_site_orb(request: AdminOrbChatRequest):
    session_id = request.session_id or f"shep_site_{uuid.uuid4().hex[:10]}"
    stimulus = {
        "message": request.message,
        "page_context": request.page_context,
        "session_id": session_id,
        "assistant": "Shep",
        "core": "Renova_te_ipsum",
    }
    cognitive = _derive_cognitive_mode(stimulus)

    prompt = (
        f"Route: {str((request.context or {}).get('route_path') or '/')}\n"
        f"Page context: {request.page_context}\n"
        f"Visitor request: {request.message}"
    )

    llm_mode = "ollama"
    llm_endpoint = f"{OLLAMA_BASE_URL}/api/chat"
    try:
        shep_result = await asyncio.to_thread(_call_ollama, prompt, _SHEP_SITE_SYSTEM_PROMPT)
    except requests.RequestException as exc:
        lower = request.message.lower()
        if request.page_context == "products" or any(word in lower for word in ("cut", "hog", "lamb", "freezer", "order", "price")):
            response_text = "Butch is the best hand for cuts, orders, freezer planning, and product questions. Open Butch on the products page and he can walk it through."
        elif request.page_context == "livestock" or any(word in lower for word in ("livestock", "sheep", "katahdin", "ewe", "ram", "tag", "breeding")):
            response_text = "I can help with livestock direction, but the Qwen core is offline right now. Start with animal type, tag, bloodline, and what you want to know, then Butch can help as ranch hand once the service is back."
        else:
            response_text = "Shep is online, but the Qwen core is not reachable right now. I can still help with basic site direction while the local service comes back."
        shep_result = {
            "status": "degraded",
            "response": response_text,
            "response_text": response_text,
            "intent": {"type": "site_assistant"},
            "metadata": {"confidence": 0.4, "model": OLLAMA_MODEL, "fallback_reason": str(exc)},
        }
        llm_mode = "local_site_fallback"

    response_text = shep_result.get("response_text") or shep_result.get("response") or "Shep is online."
    response_text = _sanitize_operator_response(response_text, request.page_context)

    audio_wav_base64 = None
    voice = None
    audio_engine = None
    if response_text:
        tts_payload = {
            "text": response_text,
            "voice": CALI_KOKORO_VOICE,
            "speed": CALI_KOKORO_SPEED,
        }
        try:
            tts_result = await asyncio.to_thread(_post_json, KOKORO_TTS_URL, tts_payload)
            audio_wav_base64 = tts_result.get("audio_wav_base64")
            voice = tts_result.get("voice") or CALI_KOKORO_VOICE
            audio_engine = "qwen3-tts"
        except requests.RequestException as exc:
            logger.warning("Shep Qwen TTS fallback engaged: %s", exc)

    return {
        "status": shep_result.get("status", "success"),
        "response": response_text,
        "response_text": response_text,
        "intent": shep_result.get("intent"),
        "metadata": {
            **shep_result.get("metadata", {}),
            "assistant_name": "Shep",
            "orb_core": "Renova_te_ipsum",
            "system_core": "Renova_te_ipsum",
            "mesh_connected": _mesh.available,
            "cognitive_mode": cognitive["cognitive_mode"],
            "dominant_mind": cognitive["dominant_mind"],
            "epistemic_shadows": cognitive["epistemic_shadows"],
            "llm_mode": llm_mode,
            "llm_endpoint": llm_endpoint,
            "llm_model": OLLAMA_MODEL,
            "tts_engine": "qwen3-tts",
            "cochlear_processor": CALI_CPP_VERSION,
        },
        "audio_wav_base64": audio_wav_base64,
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
