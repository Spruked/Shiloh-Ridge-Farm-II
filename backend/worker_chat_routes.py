import csv
import json
import logging
import re
import sys
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field


CURRENT_DIR = Path(__file__).resolve().parent
for candidate in (CURRENT_DIR.parent, CURRENT_DIR):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from shep_worker.job.knowledge_updater import ShepKnowledgeUpdater
from shep_worker.job.learning_logger import ShepLearningLogger
from shep_worker.job.visitor_assistance import ShepVisitorAssistant


router = APIRouter(prefix="/worker-chat", tags=["Shep Worker Chat"])
logger = logging.getLogger(__name__)


def _resolve_shep_root() -> Path:
    candidates = [
        CURRENT_DIR.parent / "shep_worker",
        CURRENT_DIR / "shep_worker",
    ]
    for path in candidates:
        if path.exists():
            return path
    return candidates[0]


SHEP_ROOT = _resolve_shep_root()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_query(text: str) -> str:
    q = (text or "").lower().strip()
    q = re.sub(r"[^\w\s]", "", q)
    q = re.sub(r"\s+", " ", q)
    return q


def _read_jsonl(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    rows: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


_ASSISTANT: Optional[ShepVisitorAssistant] = None
_db = None


def set_worker_chat_db(database) -> None:
    global _db
    _db = database


def _assistant() -> ShepVisitorAssistant:
    global _ASSISTANT
    if _ASSISTANT is None:
        _ASSISTANT = ShepVisitorAssistant(str(SHEP_ROOT))
    return _ASSISTANT


def _logger() -> ShepLearningLogger:
    return ShepLearningLogger(SHEP_ROOT)


def _updater() -> ShepKnowledgeUpdater:
    return ShepKnowledgeUpdater(SHEP_ROOT)


class WorkerMessageRequest(BaseModel):
    message: Optional[str] = None
    order_text: Optional[str] = None
    session_id: Optional[str] = None
    page_context: str = "/"
    user_type: str = "visitor"


class ApproveLearningRequest(BaseModel):
    learning_id: str
    answer: str
    category: str = "faq"
    related_concepts: List[str] = Field(default_factory=list)


class TeachRequest(BaseModel):
    question_pattern: str
    answer: str
    category: str = "faq"
    related_concepts: List[str] = Field(default_factory=list)


def _lookup_learning_id(session_id: str, raw_query: str) -> Optional[str]:
    learning_path = SHEP_ROOT / "vault" / "shep_learning.jsonl"
    rows = _read_jsonl(learning_path)
    for row in reversed(rows):
        if row.get("session_id") == session_id and row.get("raw_query") == raw_query:
            return row.get("id")
    return None


_SEX_LABELS = {"R": "Ram", "E": "Ewe", "M": "Male", "F": "Female"}

_LIVE_INTENTS: List[tuple] = [
    ("ram",       ["ram", "rams", "breeding ram", "stud ram", "buy a ram", "do you have rams"]),
    ("ewe",       ["ewe", "ewes", "female sheep", "breeding ewe", "bred ewe", "do you have ewes"]),
    ("sheep",     ["sheep for sale", "sheep available", "what sheep", "all sheep", "how many sheep",
                   "do you have sheep", "lambs for sale", "lamb for sale", "buy a lamb"]),
    ("dog",       ["pyrenees", "guardian dog", "livestock guardian", "lgd", "great pyrenees",
                   "puppy", "pup", "do you have dogs"]),
    ("chicken",   ["chicken", "hen", "hens", "rooster", "chick", "chickens for sale"]),
    ("hog",       ["whole hog", "half hog", "hog price", "hog cost", "buy a hog", "pork price",
                   "buy hog", "order hog"]),
    ("lamb_meat", ["lamb price", "lamb cost", "lamb meat", "lamb cuts", "buy lamb",
                   "sheep meat", "sheep price", "order lamb"]),
    ("eggs",      ["egg price", "buy eggs", "dozen eggs", "how much eggs", "eggs available",
                   "eggs for sale"]),
    ("products",  ["what do you sell", "what products", "what can i buy", "all products",
                   "what's available", "what is available"]),
]


def _detect_live_intent(text: str) -> Optional[str]:
    lower = text.lower()
    for intent, triggers in _LIVE_INTENTS:
        if any(t in lower for t in triggers):
            return intent
    return None


def _fmt_animal(a: dict) -> str:
    name = a.get("name") or a.get("tag_number") or "unnamed"
    sex = _SEX_LABELS.get((a.get("sex") or "").upper(), "")
    price = f"${a['price']:,.0f}" if a.get("price") else "price on request"
    weight = f", {a['weight']} lbs" if a.get("weight") else ""
    sex_str = f" ({sex})" if sex else ""
    return f"  • {name}{sex_str} — {price}{weight}"


async def _db_resolve(text: str) -> Optional[str]:
    if _db is None:
        return None
    intent = _detect_live_intent(text)
    if intent is None:
        return None

    if intent == "ram":
        animals = await _db.livestock.find(
            {"animal_type": "sheep", "sex": {"$in": ["R", "r"]}, "status": "available"},
            {"_id": 0, "name": 1, "tag_number": 1, "sex": 1, "price": 1, "weight": 1},
        ).to_list(20)
        if not animals:
            return "No rams are listed for sale right now. Contact Dominic at (660) 254-6226 to ask about upcoming availability."
        lines = [f"We have {len(animals)} ram(s) available:"] + [_fmt_animal(a) for a in animals]
        lines.append("Visit the Livestock page for photos and registration details, or contact us to reserve.")
        return "\n".join(lines)

    if intent == "ewe":
        animals = await _db.livestock.find(
            {"animal_type": "sheep", "sex": {"$in": ["E", "e"]}, "status": "available"},
            {"_id": 0, "name": 1, "tag_number": 1, "sex": 1, "price": 1, "weight": 1},
        ).to_list(20)
        if not animals:
            return "No ewes are listed for sale right now. Contact Dominic to ask about availability."
        lines = [f"We have {len(animals)} ewe(s) available:"] + [_fmt_animal(a) for a in animals]
        lines.append("View the Livestock page for full details and photos.")
        return "\n".join(lines)

    if intent == "sheep":
        animals = await _db.livestock.find(
            {"animal_type": "sheep", "status": "available"},
            {"_id": 0, "name": 1, "tag_number": 1, "sex": 1, "price": 1, "weight": 1},
        ).to_list(30)
        if not animals:
            return "No sheep are listed for sale right now. Contact Dominic about upcoming availability."
        lines = [f"We have {len(animals)} sheep available for sale:"] + [_fmt_animal(a) for a in animals]
        lines.append("Visit the Livestock page for photos, registration details, and to submit an inquiry.")
        return "\n".join(lines)

    if intent == "dog":
        animals = await _db.livestock.find(
            {"animal_type": "dog", "status": "available"},
            {"_id": 0, "name": 1, "tag_number": 1, "sex": 1, "price": 1, "weight": 1, "description": 1},
        ).to_list(10)
        if not animals:
            return "No guardian dogs are listed right now. Contact Dominic about upcoming litters."
        lines = [f"We have {len(animals)} Great Pyrenees available:"] + [_fmt_animal(a) for a in animals]
        lines.append("View the Livestock page for full details and photos.")
        return "\n".join(lines)

    if intent == "chicken":
        animals = await _db.livestock.find(
            {"animal_type": "chicken", "status": "available"},
            {"_id": 0, "color": 1, "tag_number": 1, "price": 1},
        ).to_list(10)
        products = await _db.products.find(
            {"category": "chicken", "is_available": True},
            {"_id": 0, "name": 1, "price_per_unit": 1, "unit": 1},
        ).to_list(5)
        lines = []
        if animals:
            lines.append(f"We have {len(animals)} heritage chickens available:")
            for a in animals:
                name = a.get("color") or a.get("tag_number")
                price = f"${a['price']:,.0f}" if a.get("price") else "price on request"
                lines.append(f"  • {name} — {price}")
        if products:
            if lines:
                lines.append("")
            for p in products:
                price = f"${p['price_per_unit']:.2f}/{p['unit']}" if p.get("price_per_unit") else "price on request"
                lines.append(f"  • {p['name']} — {price}")
        if not lines:
            return "No chickens are available right now. Check back soon or contact Dominic."
        lines.append("Visit the Livestock and Products pages for details.")
        return "\n".join(lines)

    if intent == "hog":
        products = await _db.products.find(
            {"category": "hog", "is_available": True},
            {"_id": 0, "name": 1, "cuts": 1, "description": 1, "estimated_lead_time": 1},
        ).to_list(5)
        if not products:
            return "No hog products are listed right now. Contact Dominic for availability."
        lines = ["We offer the following hog products:"]
        for p in products:
            lines.append(f"\n{p['name']}:")
            lines.append(f"  {p.get('description', '')}")
            cuts = p.get("cuts") or {}
            if cuts:
                lines.append("  Cut pricing ($/lb):")
                for cut, pricing in list(cuts.items())[:5]:
                    price = pricing.get("normalized", "—") if isinstance(pricing, dict) else pricing
                    lines.append(f"    {cut.replace('_', ' ').title()}: ${price}/lb")
            if p.get("estimated_lead_time"):
                lines.append(f"  Lead time: {p['estimated_lead_time']}")
        lines.append("\nGo to the Products page to order, or ask Butch for a full cut breakdown and estimate.")
        return "\n".join(lines)

    if intent == "lamb_meat":
        products = await _db.products.find(
            {"category": "sheep", "is_available": True},
            {"_id": 0, "name": 1, "cuts": 1, "description": 1, "estimated_lead_time": 1},
        ).to_list(5)
        if not products:
            return "No lamb or sheep meat products are listed right now. Contact Dominic for availability."
        lines = ["We offer the following lamb and sheep meat products:"]
        for p in products:
            lines.append(f"\n{p['name']}:")
            lines.append(f"  {p.get('description', '')}")
            cuts = p.get("cuts") or {}
            if cuts:
                lines.append("  Cut pricing ($/lb):")
                for cut, pricing in list(cuts.items())[:5]:
                    price = pricing.get("normalized", "—") if isinstance(pricing, dict) else pricing
                    lines.append(f"    {cut.replace('_', ' ').title()}: ${price}/lb")
            if p.get("estimated_lead_time"):
                lines.append(f"  Lead time: {p['estimated_lead_time']}")
        lines.append("\nGo to the Products page to order, or ask Butch for a cut breakdown and estimate.")
        return "\n".join(lines)

    if intent == "eggs":
        products = await _db.products.find(
            {"category": "eggs", "is_available": True},
            {"_id": 0, "name": 1, "price_per_unit": 1, "unit": 1},
        ).to_list(10)
        if not products:
            return "No egg products are listed right now. Contact Dominic for availability."
        lines = ["We have the following eggs available:"]
        for p in products:
            price = f"${p['price_per_unit']:.2f}/{p['unit']}" if p.get("price_per_unit") else "price on request"
            lines.append(f"  • {p['name']} — {price}")
        lines.append("Visit the Products page to order.")
        return "\n".join(lines)

    if intent == "products":
        products = await _db.products.find(
            {"is_available": True},
            {"_id": 0, "name": 1, "category": 1, "price_per_unit": 1, "unit": 1},
        ).to_list(30)
        if not products:
            return "No products are listed right now. Contact Dominic directly."
        by_cat: dict = {}
        for p in products:
            by_cat.setdefault(p.get("category", "other"), []).append(p)
        lines = ["Here's what we currently have available:"]
        for cat, items in by_cat.items():
            lines.append(f"\n{cat.title()}:")
            for p in items:
                price = f"${p['price_per_unit']:.2f}/{p['unit']}" if p.get("price_per_unit") else "priced by quote"
                lines.append(f"  • {p['name']} — {price}")
        lines.append("\nVisit the Products page for full details and to place an order.")
        return "\n".join(lines)

    return None


def _fallback_suggestions(status: str) -> List[str]:
    if status == "learning_logged":
        return [
            "What livestock do you raise?",
            "How do I place an order?",
            "Bring in Butch",
        ]
    return [
        "How do I place an order?",
        "What products are available?",
        "Bring in Butch",
    ]


@router.post("/message")
async def worker_message(request: WorkerMessageRequest):
    text = (request.message or request.order_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message is required")

    session_id = request.session_id or f"worker_{uuid.uuid4().hex[:10]}"

    # Live DB resolution — factual, current, no hallucination possible
    db_answer = await _db_resolve(text)
    if db_answer:
        return {
            "response": db_answer,
            "status": "db_resolved",
            "session_id": session_id,
            "learning_id": None,
            "suggestions": ["View Livestock", "Go to Products", "Contact Us"],
        }

    result = _assistant().ask(text, page=request.page_context or "/", session_id=session_id)

    learning_id = None
    if result.get("status") == "learning_logged":
        learning_id = _lookup_learning_id(session_id, text)

    return {
        "response": result.get("text", ""),
        "status": result.get("status", "unknown"),
        "session_id": session_id,
        "learning_id": learning_id,
        "suggestions": _fallback_suggestions(result.get("status", "unknown")),
    }


@router.post("/feedback")
async def worker_feedback(session_id: str = Query(...), helpful: bool = Query(...)):
    feedback_path = SHEP_ROOT / "trace" / "interaction_log.jsonl"
    record = {
        "timestamp": _utc_now(),
        "session_id": session_id,
        "feedback_helpful": helpful,
        "event": "feedback",
    }
    with open(feedback_path, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(record) + "\n")
    return {"ok": True}


@router.get("/admin/stats")
async def worker_admin_stats():
    knowledge_path = SHEP_ROOT / "vault" / "shep_knowledge.csv"
    approved_path = SHEP_ROOT / "vault" / "shep_approved.jsonl"
    interaction_path = SHEP_ROOT / "trace" / "interaction_log.jsonl"

    rows: List[Dict[str, str]] = []
    if knowledge_path.exists():
        with open(knowledge_path, "r", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))

    category_counts = Counter()
    for row in rows:
        category = (row.get("category") or "faq").strip() or "faq"
        category_counts[category] += 1

    pending = len(_logger().get_pending_items(limit=5000))

    approved_rows = _read_jsonl(approved_path)
    learned_total = len([row for row in approved_rows if row.get("status") == "approved"])

    interactions = _read_jsonl(interaction_path)
    recent_sessions = len({row.get("session_id") for row in interactions if row.get("session_id")})

    return {
        "total_knowledge_nodes": len(rows),
        "pending_learning": pending,
        "learned_total": learned_total,
        "recent_conversations": recent_sessions,
        "knowledge_by_category": {
            "website_feature": category_counts.get("website_feature", 0),
            "product_info": category_counts.get("product_info", 0),
            "process": category_counts.get("process", 0),
            "faq": category_counts.get("faq", 0) + category_counts.get("general", 0),
            "unanswered": pending,
        },
    }


@router.get("/admin/learning-queue")
async def worker_admin_learning_queue():
    queue = _logger().get_pending_items(limit=500)
    response = []
    for item in queue:
        response.append(
            {
                "id": item.get("id"),
                "question": item.get("raw_query", ""),
                "timestamp": item.get("timestamp"),
                "context": {
                    "page": item.get("page_context", "/"),
                    "user_type": "visitor",
                },
            }
        )
    return response


@router.get("/admin/knowledge")
async def worker_admin_knowledge():
    knowledge_path = SHEP_ROOT / "vault" / "shep_knowledge.csv"
    rows: List[Dict[str, str]] = []
    if knowledge_path.exists():
        with open(knowledge_path, "r", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))

    knowledge = []
    for index, row in enumerate(rows):
        trigger = (row.get("triggers") or "").split("|")[0].strip()
        concept = trigger or row.get("id") or f"concept_{index}"
        category = (row.get("category") or "faq").strip() or "faq"
        knowledge.append(
            {
                "id": row.get("id") or f"row_{index}",
                "concept": concept,
                "content": row.get("answer", ""),
                "category": category,
                "confidence": 0.95,
                "access_count": 0,
                "related_concepts": [c.strip() for c in concept.split(" ") if c.strip()][:5],
            }
        )

    return {"knowledge": knowledge}


@router.post("/admin/approve-learning")
async def worker_admin_approve_learning(request: ApproveLearningRequest):
    item = _logger().get_item_by_id(request.learning_id)
    normalized_query = (
        item.get("normalized_query")
        if item
        else _normalize_query(request.learning_id)
    )
    raw_query = item.get("raw_query") if item else request.learning_id

    draft = {
        "id": request.learning_id,
        "normalized_query": normalized_query,
        "raw_query": raw_query,
        "draft_answer": request.answer,
        "cali_notes": f"Approved via Shep admin ({request.category})",
    }

    updater = _updater()
    updater.submit_for_approval(draft)
    updater.human_approve(
        item_id=request.learning_id,
        approved_answer=request.answer,
        approved_by="admin",
        edit_notes=f"Category: {request.category}",
    )

    _logger().update_status(
        request.learning_id,
        "approved_ingested",
        {"actor": "admin", "note": "Approved in worker admin panel"},
    )
    _assistant().reload_knowledge()

    return {"ok": True, "learning_id": request.learning_id}


@router.post("/admin/teach")
async def worker_admin_teach(request: TeachRequest):
    if not request.question_pattern.strip() or not request.answer.strip():
        raise HTTPException(status_code=400, detail="question_pattern and answer are required")

    learning_id = f"teach_{uuid.uuid4().hex[:10]}"
    normalized_query = _normalize_query(request.question_pattern)

    draft = {
        "id": learning_id,
        "normalized_query": normalized_query,
        "raw_query": request.question_pattern,
        "draft_answer": request.answer,
        "cali_notes": f"Manual teach entry ({request.category})",
    }

    updater = _updater()
    updater.submit_for_approval(draft)
    updater.human_approve(
        item_id=learning_id,
        approved_answer=request.answer,
        approved_by="admin",
        edit_notes=f"Category: {request.category}",
    )

    _assistant().reload_knowledge()

    return {"ok": True, "learning_id": learning_id}
