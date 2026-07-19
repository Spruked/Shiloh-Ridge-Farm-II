import csv
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from butch_grounding import butch_evidence
from substrate_service import publish_orb_artifact


CURRENT_DIR = Path(__file__).resolve().parent
for candidate in (CURRENT_DIR.parent, CURRENT_DIR):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

try:
    from butch_worker.job.order_parser import ButchOrderHandler
    from butch_worker.logic.meat_library import MeatLibrary
    from butch_worker.logic.knowledge_engine import ButchKnowledgeEngine
except ModuleNotFoundError:
    class _FallbackProfiles:
        def update_profile(self, *_args, **_kwargs):
            return None

        def get_order_history(self, *_args, **_kwargs):
            return []

    class ButchOrderHandler:
        def __init__(self, _root: str):
            self.profiles = _FallbackProfiles()

        def process(self, text: str, **_kwargs) -> Dict[str, Any]:
            lower = text.lower()
            meat_type = "hog" if "hog" in lower or "pork" in lower else "lamb" if "lamb" in lower or "sheep" in lower else None
            order_size = "half" if "half" in lower else "whole" if "whole" in lower else None
            total = 0
            if meat_type and order_size:
                total = 850 if meat_type == "hog" and order_size == "half" else 1650 if meat_type == "hog" else 450 if order_size == "half" else 850
            return {
                "data": {
                    "parsed": {"meat_type": meat_type, "order_size": order_size},
                    "yield_estimate": {
                        "hanging_weight": None,
                        "finished_weight": None,
                        "total_estimated": total,
                    } if total else {},
                    "suggestions": {
                        "suggestions": [
                            {"text": "I want a whole hog"},
                            {"text": "How much meat from a half lamb?"},
                            {"text": "What freezer space do I need?"},
                        ]
                    },
                }
            }

    class MeatLibrary:
        def __init__(self, _root: Path):
            pass

        def get_meat_data(self, meat_type: str, order_type: str) -> Dict[str, Any]:
            if meat_type == "hog":
                base = {
                    "whole": [180, 220, 3.75, 375],
                    "half": [90, 110, 3.95, 225],
                }.get(order_type)
                cuts = {
                    "pork_chops": {"yield_pct": 0.14, "price_per_lb": 7.5},
                    "shoulder_roast": {"yield_pct": 0.12, "price_per_lb": 6.5},
                    "ham": {"yield_pct": 0.18, "price_per_lb": 6.25},
                    "bacon": {"yield_pct": 0.10, "price_per_lb": 9.0},
                    "sausage": {"yield_pct": 0.16, "price_per_lb": 6.0},
                    "ribs": {"yield_pct": 0.07, "price_per_lb": 7.0},
                }
            else:
                base = {
                    "whole": [45, 65, 5.5, 175],
                    "half": [22, 34, 5.75, 110],
                }.get(order_type)
                cuts = {
                    "leg_roast": {"yield_pct": 0.20, "price_per_lb": 10.0},
                    "loin_chops": {"yield_pct": 0.12, "price_per_lb": 13.0},
                    "shoulder": {"yield_pct": 0.14, "price_per_lb": 9.0},
                    "rack": {"yield_pct": 0.09, "price_per_lb": 16.0},
                    "ground": {"yield_pct": 0.18, "price_per_lb": 8.0},
                    "stew_meat": {"yield_pct": 0.10, "price_per_lb": 8.5},
                }
            if not base:
                return {}
            low, high, price, processing = base
            return {
                "hanging_weight_range": [low, high],
                "hanging_weight_avg": (low + high) / 2,
                "finished_weight_ratio": 0.70,
                "price_per_lb_hanging": price,
                "processing_cost": processing,
                "cuts": cuts,
            }

    class ButchKnowledgeEngine:
        def __init__(self, _root: Path):
            self.rows: List[Dict[str, str]] = []
            for path in (
                CURRENT_DIR.parent / "assets" / "butch_product_knowledge.csv",
                CURRENT_DIR / "assets" / "butch_product_knowledge.csv",
            ):
                if path.exists():
                    with open(path, "r", encoding="utf-8") as handle:
                        self.rows = list(csv.DictReader(handle))
                    break

        def match(self, text: str) -> Optional[str]:
            lower = text.lower()
            matches = []
            for row in self.rows:
                triggers = [trigger.strip().lower() for trigger in (row.get("triggers") or "").split("|")]
                matched = [trigger for trigger in triggers if trigger and trigger in lower]
                query_words = set(lower.split())
                overlap = max((len(query_words & set(trigger.split())) for trigger in triggers), default=0)
                if matched or overlap >= 2:
                    exact_score = max((len(trigger) for trigger in matched), default=0)
                    matches.append((overlap * 20 + exact_score, row.get("response") or None))
            if matches:
                return max(matches, key=lambda item: item[0])[1]
            if "freezer" in lower:
                return "Plan roughly 1 cubic foot of freezer space for every 25 to 30 pounds of packaged meat."
            if "hanging weight" in lower or "carcass weight" in lower:
                return "Hanging weight is the carcass weight after slaughter, before cutting and trimming."
            if "cut" in lower or "yield" in lower:
                return "I can help estimate cuts and yield for whole or half hog and lamb orders."
            return None

        def log_unknown(self, *_args, **_kwargs):
            return None


router = APIRouter(prefix="/butcher", tags=["Butcher Compatibility"])

_db = None


def set_butcher_db(database) -> None:
    global _db
    _db = database


def _resolve_butch_root() -> Path:
    candidates = [
        CURRENT_DIR.parent / "butch_worker",
        CURRENT_DIR / "butch_worker",
    ]
    for path in candidates:
        if path.exists():
            return path
    return candidates[0]


BUTCH_ROOT = _resolve_butch_root()
_HANDLER: Optional[ButchOrderHandler] = None
_LIBRARY: Optional[MeatLibrary] = None
_KNOWLEDGE: Optional[ButchKnowledgeEngine] = None


def _handler() -> ButchOrderHandler:
    global _HANDLER
    if _HANDLER is None:
        _HANDLER = ButchOrderHandler(str(BUTCH_ROOT))
    return _HANDLER


def _knowledge() -> ButchKnowledgeEngine:
    global _KNOWLEDGE
    if _KNOWLEDGE is None:
        _KNOWLEDGE = ButchKnowledgeEngine(BUTCH_ROOT)
    return _KNOWLEDGE


def _library() -> MeatLibrary:
    global _LIBRARY
    if _LIBRARY is None:
        _LIBRARY = MeatLibrary(BUTCH_ROOT)
    return _LIBRARY


class ParseRequest(BaseModel):
    order_text: str
    session_id: Optional[str] = None
    visitor_name: Optional[str] = None
    visitor_email: Optional[str] = None
    visitor_phone: Optional[str] = None
    page_context: str = "/products"


class CalculateRequest(BaseModel):
    meat_type: str
    order_type: str
    live_weight: Optional[float] = None


def _title_from_key(key: str) -> str:
    return key.replace("_", " ").title()


def _cut_description(cut_name: str, meat_type: str) -> str:
    descriptions = {
        "pork_chops": "Center-cut chops for grilling or pan searing.",
        "shoulder_roast": "Great for low-and-slow roasting and pulled pork.",
        "ham": "Cured or fresh ham cuts for larger meals.",
        "bacon": "Belly cuts typically cured and smoked as bacon.",
        "sausage": "Ground and seasoned trim for versatile meals.",
        "ribs": "Classic rib cuts for smoking or grilling.",
        "hocks": "Flavorful shank cuts for soups and braises.",
        "leg_roast": "Traditional lamb roast with rich flavor.",
        "loin_chops": "Premium lamb chops, quick to cook.",
        "shoulder": "Budget-friendly roast or braise cut.",
        "rack": "Tender rack cut for roasting and carving.",
        "shanks": "Slow-cook cut for braises and stews.",
        "ground": "Ground meat for burgers, meatballs, and patties.",
        "stew_meat": "Cubed cuts for soups and stews.",
        "bones": "Soup bones and stock-building bones.",
        "fat": "Fat trim for rendering or sausage blends.",
    }
    return descriptions.get(cut_name, f"{_title_from_key(cut_name)} from {meat_type} processing.")


def _cooking_methods(cut_name: str) -> List[str]:
    methods = {
        "pork_chops": ["grilling", "pan_sear", "broil"],
        "shoulder_roast": ["roast", "slow_cook", "smoke"],
        "ham": ["roast", "smoke", "bake"],
        "bacon": ["pan_fry", "oven", "griddle"],
        "sausage": ["grill", "pan_fry", "smoke"],
        "ribs": ["smoke", "grill", "roast"],
        "hocks": ["braise", "stew", "slow_cook"],
        "leg_roast": ["roast", "grill", "smoke"],
        "loin_chops": ["grill", "pan_sear", "broil"],
        "shoulder": ["braise", "roast", "slow_cook"],
        "rack": ["roast", "grill", "broil"],
        "shanks": ["braise", "slow_cook", "stew"],
        "ground": ["grill", "pan_fry", "bake"],
        "stew_meat": ["stew", "braise", "slow_cook"],
    }
    return methods.get(cut_name, ["roast", "grill"])


def _primal_for_cut(cut_name: str, meat_type: str) -> str:
    hog_map = {
        "pork_chops": "Loin",
        "shoulder_roast": "Shoulder",
        "ham": "Ham",
        "bacon": "Belly",
        "sausage": "Trim & Sausage",
        "ribs": "Rib",
        "hocks": "Shank",
        "fat": "Fat",
        "bones": "Bones",
    }
    lamb_map = {
        "leg_roast": "Leg",
        "loin_chops": "Loin",
        "shoulder": "Shoulder",
        "rack": "Rack",
        "shanks": "Shank",
        "ground": "Trim & Ground",
        "stew_meat": "Trim & Ground",
        "bones": "Bones",
        "fat": "Fat",
    }
    table = hog_map if meat_type == "hog" else lamb_map
    return table.get(cut_name, "Assorted")


def _round_range(low: float, high: float, ndigits: int) -> List[float]:
    return [round(low, ndigits), round(high, ndigits)]


def _build_estimate(meat_type: str, order_type: str, live_weight: Optional[float]) -> Dict[str, Any]:
    data = _library().get_meat_data(meat_type, order_type)
    if not data:
        raise HTTPException(status_code=404, detail="Unknown meat type or order size")

    hanging_ratio = 0.72 if meat_type == "hog" else 0.52
    finished_ratio = float(data.get("finished_weight_ratio", 0.70))

    if live_weight is not None and live_weight > 0:
        hanging_mid = live_weight * hanging_ratio
        hanging_low = hanging_mid * 0.95
        hanging_high = hanging_mid * 1.05
        live_weight_used = round(live_weight, 1)
    else:
        hanging_low, hanging_high = data.get("hanging_weight_range", [0, 0])
        live_weight_used = round(float(data.get("hanging_weight_avg", 0)) / hanging_ratio, 1)

    finished_low = hanging_low * finished_ratio
    finished_high = hanging_high * finished_ratio

    processing_cost = float(data.get("processing_cost", 0))
    hanging_price = float(data.get("price_per_lb_hanging", 0))

    total_low = (hanging_low * hanging_price) + processing_cost
    total_high = (hanging_high * hanging_price) + processing_cost

    cuts = data.get("cuts", {})
    grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    for cut_name, cut_data in cuts.items():
        if cut_name == "trim_loss":
            continue
        yield_pct = float(cut_data.get("yield_pct", 0))
        cut_low_lb = finished_low * yield_pct
        cut_high_lb = finished_high * yield_pct
        price_per_lb = float(cut_data.get("price_per_lb", 0))
        grouped[_primal_for_cut(cut_name, meat_type)].append(
            {
                "name": _title_from_key(cut_name),
                "description": _cut_description(cut_name, meat_type),
                "cooking_methods": _cooking_methods(cut_name),
                "estimated_lbs": _round_range(cut_low_lb, cut_high_lb, 1),
                "price_per_lb": round(price_per_lb, 2),
                "estimated_total": _round_range(cut_low_lb * price_per_lb, cut_high_lb * price_per_lb, 2),
            }
        )

    primal_cuts = []
    for primal_name, retail_cuts in grouped.items():
        low_sum = sum(cut["estimated_lbs"][0] for cut in retail_cuts)
        high_sum = sum(cut["estimated_lbs"][1] for cut in retail_cuts)
        primal_cuts.append(
            {
                "name": primal_name,
                "estimated_lbs": [round(low_sum, 1), round(high_sum, 1)],
                "retail_cuts": retail_cuts,
            }
        )

    primal_cuts.sort(key=lambda row: row["name"])

    return {
        "live_weight": live_weight_used,
        "hanging_weight": _round_range(hanging_low, hanging_high, 1),
        "finished_weight": _round_range(finished_low, finished_high, 1),
        "total_estimated_cost": _round_range(total_low, total_high, 2),
        "primal_cuts": primal_cuts,
        "processing_notes": [
            "All estimates are planning ranges and will vary by animal and cut instructions.",
            "Final packaged weight depends on trim preference, bone-in vs boneless, and processor method.",
            "Contact the farm to confirm final pricing, pickup date, and custom cut sheet details.",
        ],
    }


@router.post("/parse")
async def parse_order(request: ParseRequest):
    raw_text = (request.order_text or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="order_text is required")

    parse_text = raw_text
    if request.visitor_email and request.visitor_email not in parse_text:
        parse_text = f"{parse_text} email {request.visitor_email}"

    result = _handler().process(
        parse_text,
        page=request.page_context or "/products",
        session_id=request.session_id,
    )

    data = result.get("data") or {}
    parsed = data.get("parsed") or {}
    parsed_successfully = bool(parsed.get("meat_type") and parsed.get("order_size"))

    email = request.visitor_email or parsed.get("email")
    if email and (request.visitor_name or request.visitor_phone):
        _handler().profiles.update_profile(
            email,
            {
                "name": request.visitor_name,
                "phone": request.visitor_phone,
            },
        )

    history_rows = []
    if email:
        history_rows = _handler().profiles.get_order_history(email, limit=5)

    recalled_orders = []
    for row in history_rows:
        items = row.get("items") or row.get("order_items") or []
        if isinstance(items, list):
            item_text = []
            for item in items:
                if isinstance(item, dict):
                    name = item.get("product_name") or item.get("cut") or item.get("product_id") or "item"
                    qty = item.get("qty") or item.get("quantity") or 1
                    item_text.append(f"{name} x{qty}")
                else:
                    item_text.append(str(item))
        else:
            item_text = [str(items)]

        recalled_orders.append(
            {
                "id": row.get("order_id") or row.get("id") or "order",
                "status": row.get("status", "completed"),
                "total_amount": row.get("total_paid") or row.get("total") or 0,
                "items": item_text,
            }
        )

    yield_estimate = data.get("yield_estimate") or {}
    estimate_summary = None
    if yield_estimate:
        estimate_summary = {
            "hanging_weight": yield_estimate.get("hanging_weight"),
            "finished_weight": yield_estimate.get("finished_weight"),
            "total_estimated": yield_estimate.get("total_estimated"),
        }

    knowledge_answer = _knowledge().match(raw_text)
    evidence = butch_evidence()

    if knowledge_answer:
        reply = knowledge_answer
    elif parsed_successfully and yield_estimate:
        reply = (
            f"Got it. I read this as a {parsed.get('order_size')} {parsed.get('meat_type')}. "
            f"Estimated total is about ${float(yield_estimate.get('total_estimated', 0)):.2f}."
        )
    elif parsed_successfully:
        reply = (
            f"I read this as a {parsed.get('order_size')} {parsed.get('meat_type')}. "
            "I can break down expected cuts and freezer planning next."
        )
    else:
        reply = (
            "I can help with whole or half hog/lamb planning. "
            "Tell me the animal and order size, and I will map cuts and estimated yield."
        )

    suggestion_items = data.get("suggestions", {}).get("suggestions", [])
    suggestions = [item.get("text") for item in suggestion_items if item.get("text")]
    if not suggestions:
        suggestions = [
            "I want a whole hog",
            "How much meat from a half lamb?",
            "What freezer space do I need?",
        ]

    learning = publish_orb_artifact(
        "butch_interaction",
        {
            "schema": "orb.mesh.butch_learning.v1",
            "question": raw_text,
            "answer": reply,
            "evidence": evidence,
            "page_context": request.page_context,
            "contains_customer_record": False,
        },
        source_orb="butch",
        tags=["shiloh-ridge", "butch", "butcher-knowledge"],
        confidence=max([pointer.get("confidence", 0.65) for pointer in evidence] or [0.65]),
    )

    return {
        "reply": reply,
        "parsed_successfully": parsed_successfully,
        "meat_type": parsed.get("meat_type"),
        "order_type": parsed.get("order_size"),
        "estimate_summary": estimate_summary,
        "recalled_orders": recalled_orders,
        "suggestions": suggestions,
        "visitor_profile": {
            "name": request.visitor_name,
            "email": email,
            "phone": request.visitor_phone,
        },
        "parse_result": parsed,
        "evidence": evidence,
        "grounding_warnings": [] if evidence else ["Shiloh crawl and butcher knowledge sources are unavailable."],
        "mesh_artifact_id": learning.get("artifact_id"),
    }


@router.post("/calculate")
async def calculate_cuts(request: CalculateRequest):
    meat_type = (request.meat_type or "").lower().strip()
    order_type = (request.order_type or "").lower().strip()
    if meat_type not in {"hog", "lamb"}:
        raise HTTPException(status_code=400, detail="meat_type must be hog or lamb")
    if order_type not in {"whole", "half"}:
        raise HTTPException(status_code=400, detail="order_type must be whole or half")

    estimate = _build_estimate(meat_type, order_type, request.live_weight)
    return {"estimate": estimate}


@router.get("/cuts/{meat_type}")
async def get_cut_guide(meat_type: str):
    mt = (meat_type or "").lower().strip()
    if mt not in {"hog", "lamb"}:
        raise HTTPException(status_code=400, detail="meat_type must be hog or lamb")

    data = _library().get_meat_data(mt, "whole")
    if not data:
        raise HTTPException(status_code=404, detail="Cut guide unavailable")

    hanging_low, hanging_high = data.get("hanging_weight_range", [0, 0])
    finished_ratio = float(data.get("finished_weight_ratio", 0.70))
    finished_low = hanging_low * finished_ratio
    finished_high = hanging_high * finished_ratio

    cuts = []
    for cut_name, cut_data in data.get("cuts", {}).items():
        if cut_name == "trim_loss":
            continue
        yield_pct = float(cut_data.get("yield_pct", 0))
        low_lb = finished_low * yield_pct
        high_lb = finished_high * yield_pct
        cuts.append(
            {
                "primal": _primal_for_cut(cut_name, mt).lower().replace(" ", "_"),
                "name": cut_name,
                "description": _cut_description(cut_name, mt),
                "price_per_lb": round(float(cut_data.get("price_per_lb", 0)), 2),
                "estimated_lbs": [round(low_lb, 1), round(high_lb, 1)],
            }
        )

    return {"cuts": cuts}


# ---------------------------------------------------------------------------
# Chat endpoint — DB-first → CSV SKG → livestock redirect → unknown logging
# ---------------------------------------------------------------------------

class ButchChatRequest(BaseModel):
    message: Optional[str] = None
    session_id: Optional[str] = None
    page_context: str = "/products"


_LIVESTOCK_INTENTS = [
    ("ram",     ["breeding ram", "stud ram", "do you have rams", "buy a ram"]),
    ("ewe",     ["breeding ewe", "do you have ewes", "buy a ewe", "ewe lamb"]),
    ("sheep",   ["sheep for sale", "lambs for sale", "do you have sheep", "live lamb"]),
    ("dog",     ["great pyrenees", "guardian dog", "lgd", "puppy for sale"]),
    ("chicken", ["live chicken", "chickens for sale", "buy a chicken"]),
]


def _is_livestock_query(text: str) -> bool:
    lower = text.lower()
    return any(phrase in lower for _, phrases in _LIVESTOCK_INTENTS for phrase in phrases)


async def _db_resolve_product(text: str) -> Optional[str]:
    """Query MongoDB for live product data — hog, lamb, eggs, chickens."""
    if _db is None:
        return None
    lower = text.lower()

    # Hog products
    if any(
        w in lower
        for w in [
            "whole hog price",
            "half hog price",
            "whole hog cost",
            "how much does a whole hog cost",
            "hog cost",
            "pork price",
            "buy hog",
            "order hog",
        ]
    ):
        products = await _db.products.find(
            {"category": "hog", "is_available": True},
            {"_id": 0, "name": 1, "price_per_unit": 1, "unit": 1, "estimated_lead_time": 1},
        ).to_list(5)
        if not products:
            return "No hog products are listed right now. Contact Dominic at (660) 254-6226 for availability."
        lines = ["Current hog products:"]
        for p in products:
            price = f"${p['price_per_unit']:.2f}/{p['unit']}" if p.get("price_per_unit") else "price on request"
            lead = f" — lead time: {p['estimated_lead_time']}" if p.get("estimated_lead_time") else ""
            lines.append(f"  • {p['name']} — {price}{lead}")
        lines.append("Go to the Products page to order, or ask me for a yield estimate.")
        return "\n".join(lines)

    # Lamb products
    if any(
        w in lower
        for w in [
            "lamb price",
            "lamb cost",
            "sheep meat price",
            "buy lamb",
            "order lamb",
            "lamb products",
            "what lamb products",
            "what lamb products do you sell",
        ]
    ):
        products = await _db.products.find(
            {"category": "sheep", "is_available": True},
            {"_id": 0, "name": 1, "price_per_unit": 1, "unit": 1, "estimated_lead_time": 1},
        ).to_list(5)
        if not products:
            return "No lamb products are listed right now. Contact Dominic at (660) 254-6226 for availability."
        lines = ["Current lamb products:"]
        for p in products:
            price = f"${p['price_per_unit']:.2f}/{p['unit']}" if p.get("price_per_unit") else "price on request"
            lead = f" — lead time: {p['estimated_lead_time']}" if p.get("estimated_lead_time") else ""
            lines.append(f"  • {p['name']} — {price}{lead}")
        lines.append("Go to the Products page to order, or ask me for a yield estimate.")
        return "\n".join(lines)

    # Eggs
    if any(w in lower for w in ["egg price", "buy eggs", "eggs available", "how much eggs"]):
        products = await _db.products.find(
            {"category": "eggs", "is_available": True},
            {"_id": 0, "name": 1, "price_per_unit": 1, "unit": 1},
        ).to_list(5)
        if not products:
            return "No eggs are listed right now. Contact Dominic to ask about availability."
        lines = ["Current egg products:"]
        for p in products:
            price = f"${p['price_per_unit']:.2f}/{p['unit']}" if p.get("price_per_unit") else "price on request"
            lines.append(f"  • {p['name']} — {price}")
        lines.append("Visit the Products page to order.")
        return "\n".join(lines)

    # All products
    if any(w in lower for w in ["what do you sell", "what products", "what can i buy", "all products", "what's available"]):
        products = await _db.products.find(
            {"is_available": True},
            {"_id": 0, "name": 1, "category": 1, "price_per_unit": 1, "unit": 1},
        ).to_list(30)
        if not products:
            return "No products are currently listed. Contact Dominic directly at (660) 254-6226."
        by_cat: Dict[str, List] = {}
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


@router.post("/chat")
async def butcher_chat(request: ButchChatRequest):
    import uuid
    text = (request.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="message is required")

    session_id = request.session_id or f"butch_{uuid.uuid4().hex[:10]}"
    context = {"page": request.page_context, "session_id": session_id}

    # 1. Livestock redirect — not Butch's domain
    if _is_livestock_query(text):
        return {
            "response": "Live animal availability is Shep's department, not mine. Ask Shep, or visit the Livestock page.",
            "status": "livestock_redirect",
            "session_id": session_id,
            "suggestions": ["Ask Shep", "View Livestock", "Calculate a whole hog"],
        }

    # 2. DB-first — live pricing and product availability from MongoDB
    db_answer = await _db_resolve_product(text)
    if db_answer:
        return {
            "response": db_answer,
            "status": "db_resolved",
            "session_id": session_id,
            "suggestions": ["Calculate a whole hog", "Go to Products", "Contact Us"],
        }

    # 3. CSV SKG — static product knowledge, buying guidance, education
    skg = _knowledge()
    csv_answer = skg.match(text)
    if csv_answer:
        return {
            "response": csv_answer,
            "status": "skg_matched",
            "session_id": session_id,
            "suggestions": ["Calculate a whole hog", "Calculate a whole lamb", "Go to Products"],
        }

    # 4. Unknown — log for CALI/admin review, return honest fallback
    skg.log_unknown(text, context)
    return {
        "response": "Good question — I don't have that one yet. I've logged it for review. Try the Products page, or contact Dominic at (660) 254-6226.",
        "status": "learning_logged",
        "session_id": session_id,
        "suggestions": ["Go to Products", "Contact Us", "Calculate a whole hog"],
    }
