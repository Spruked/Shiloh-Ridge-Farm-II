from datetime import datetime, timedelta, timezone
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, EmailStr, Field


router = APIRouter(tags=["product-assistant"])

db = None


def set_product_assistant_db(database):
    global db
    db = database


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _dt_to_iso(value: datetime) -> str:
    return value.isoformat()


def _iso_to_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", (value or "").lower())).strip()


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", normalize_text(value)).strip("-")


class ButcherCalcRequest(BaseModel):
    meat_type: str
    order_type: str
    live_weight: Optional[float] = None


class ButcherAssistantRequest(BaseModel):
    order_text: str
    session_id: Optional[str] = None
    visitor_name: Optional[str] = None
    visitor_email: Optional[EmailStr] = None
    visitor_phone: Optional[str] = None
    page_context: str = "products"


class VisitorProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    last_seen_at: datetime = Field(default_factory=utc_now)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    last_page_context: str = "products"
    prior_order_ids: List[str] = []
    preferred_meat_types: List[str] = []
    preferred_order_types: List[str] = []
    total_conversations: int = 0
    notes: List[str] = []


class ButcherKnowledgeEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    key: str
    title: str
    triggers: List[str]
    response: str
    suggestions: List[str] = []
    tags: List[str] = []
    active: bool = True
    helpful_count: int = 0
    unhelpful_count: int = 0
    use_count: int = 0
    source: str = "seed"
    last_used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ButcherLearningRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    normalized_query: str
    sample_query: str
    page_context: str = "products"
    status: str = "pending"  # pending, promoted, pruned
    occurrence_count: int = 1
    last_seen_at: datetime = Field(default_factory=utc_now)
    first_seen_at: datetime = Field(default_factory=utc_now)
    session_ids: List[str] = []
    tags: List[str] = []


HOG_CUTS: List[Dict[str, Any]] = [
    {
        "primal": "shoulder",
        "name": "pork shoulder",
        "description": "Excellent for roasts, pulled pork, sausage, and slow cooking.",
        "price_per_lb": 6.75,
        "yield_share": 0.22,
    },
    {
        "primal": "loin",
        "name": "pork chops",
        "description": "Center-cut chops and loin roasts with good marbling and versatility.",
        "price_per_lb": 9.5,
        "yield_share": 0.19,
    },
    {
        "primal": "belly",
        "name": "pork belly / bacon",
        "description": "Belly cuts that can be cured for bacon or roasted fresh.",
        "price_per_lb": 11.25,
        "yield_share": 0.13,
    },
    {
        "primal": "ham",
        "name": "fresh ham",
        "description": "Large roasts or ham cuts from the hind leg.",
        "price_per_lb": 8.5,
        "yield_share": 0.24,
    },
    {
        "primal": "trim",
        "name": "ground pork / sausage",
        "description": "Trim suitable for sausage, burger blends, and seasoning packages.",
        "price_per_lb": 7.25,
        "yield_share": 0.14,
    },
]


LAMB_CUTS: List[Dict[str, Any]] = [
    {
        "primal": "leg",
        "name": "leg of lamb",
        "description": "Whole or half legs for roasts, grilling, or kebab trimming.",
        "price_per_lb": 13.5,
        "yield_share": 0.28,
    },
    {
        "primal": "loin",
        "name": "lamb chops",
        "description": "Loin and rib chops, premium grilling cuts.",
        "price_per_lb": 18.0,
        "yield_share": 0.14,
    },
    {
        "primal": "shoulder",
        "name": "shoulder roast",
        "description": "Flavorful roasts and braising cuts with strong lamb character.",
        "price_per_lb": 11.75,
        "yield_share": 0.2,
    },
    {
        "primal": "rack",
        "name": "rack of lamb",
        "description": "Premium rib section suitable for elegant roasted presentations.",
        "price_per_lb": 21.0,
        "yield_share": 0.1,
    },
    {
        "primal": "trim",
        "name": "ground lamb / stew meat",
        "description": "Trimmed cuts useful for stew meat, kebabs, and ground lamb.",
        "price_per_lb": 10.5,
        "yield_share": 0.18,
    },
]


BUTCHER_LIBRARY: Dict[str, Dict[str, Any]] = {
    "hog": {
        "label": "hog",
        "default_live_weight": {"whole": 275, "half": 140},
        "hanging_yield": 0.72,
        "finished_yield": 0.57,
        "cuts": HOG_CUTS,
        "quick_help": "Whole and half hog orders are best for families who want a freezer restock with chops, roasts, bacon, and sausage.",
    },
    "lamb": {
        "label": "lamb",
        "default_live_weight": {"whole": 120, "half": 60},
        "hanging_yield": 0.52,
        "finished_yield": 0.42,
        "cuts": LAMB_CUTS,
        "quick_help": "Whole and half lamb orders are ideal if you want premium chops, roasts, and ground lamb in one order.",
    },
}


SEED_KNOWLEDGE: List[Dict[str, Any]] = [
    {
        "key": "how-to-order",
        "title": "How To Order",
        "triggers": ["how do i order", "how to order", "place an order", "how can i buy"],
        "response": "You can build a cart on this page and submit your order request, or ask Butch for help choosing a whole or half hog or lamb. If you share your name and email, I can also remember your prior orders for your next visit.",
        "suggestions": ["I want a whole hog", "What do I get from a half lamb?", "Show me prior orders"],
        "tags": ["ordering", "checkout"],
    },
    {
        "key": "freezer-space",
        "title": "Freezer Space",
        "triggers": ["freezer space", "how much freezer", "how much room", "how big freezer"],
        "response": "As a rule of thumb, a whole hog often needs around 8 to 10 cubic feet of freezer space, while a whole lamb usually fits in roughly 3 to 4 cubic feet. Exact space depends on cut choices and packaging.",
        "suggestions": ["Estimate a whole hog", "Estimate a whole lamb"],
        "tags": ["storage", "planning"],
    },
    {
        "key": "processing-timeline",
        "title": "Processing Timeline",
        "triggers": ["lead time", "how long", "when ready", "processing time", "how fast"],
        "response": "Orders are pre-order based, and final timing depends on production schedule and processing availability. Product lead times shown on the page are the best starting point, and we follow up directly once your order is scheduled.",
        "suggestions": ["Show product lead times", "I want to place an order"],
        "tags": ["processing", "timing"],
    },
    {
        "key": "cut-help",
        "title": "Cut Selection Help",
        "triggers": ["what cuts", "which cuts", "cut list", "cut breakdown", "best cuts"],
        "response": "Butch can help you estimate how a whole or half animal breaks down into premium cuts, family staples, and trim. Use the calculator for a weight-based estimate and the chat for a recommendation.",
        "suggestions": ["Calculate a whole hog", "Calculate a half lamb", "I want premium chops"],
        "tags": ["cuts", "calculator"],
    },
]


def build_cut_estimate(meat_type: str, order_type: str, live_weight: Optional[float]) -> Dict[str, Any]:
    if meat_type not in BUTCHER_LIBRARY:
        raise HTTPException(status_code=400, detail="Unsupported meat type")
    if order_type not in {"whole", "half"}:
        raise HTTPException(status_code=400, detail="Unsupported order type")

    library = BUTCHER_LIBRARY[meat_type]
    chosen_live_weight = live_weight or library["default_live_weight"][order_type]
    hanging_base = chosen_live_weight * library["hanging_yield"]
    finished_base = chosen_live_weight * library["finished_yield"]

    if order_type == "half":
        hanging_base = hanging_base / 2
        finished_base = finished_base / 2

    hanging_low = max(1, round(hanging_base * 0.94))
    hanging_high = max(hanging_low, round(hanging_base * 1.06))
    finished_low = max(1, round(finished_base * 0.92))
    finished_high = max(finished_low, round(finished_base * 1.08))

    primal_cuts: List[Dict[str, Any]] = []
    total_low = 0
    total_high = 0

    for cut in library["cuts"]:
        cut_weight = finished_base * cut["yield_share"]
        low_lbs = max(1, round(cut_weight * 0.9))
        high_lbs = max(low_lbs, round(cut_weight * 1.1))
        est_low = round(low_lbs * cut["price_per_lb"])
        est_high = round(high_lbs * cut["price_per_lb"])
        total_low += est_low
        total_high += est_high
        primal_cuts.append(
            {
                "name": cut["name"].title(),
                "estimated_lbs": [low_lbs, high_lbs],
                "retail_cuts": [
                    {
                        "name": cut["name"].title(),
                        "description": cut["description"],
                        "estimated_lbs": [low_lbs, high_lbs],
                        "price_per_lb": cut["price_per_lb"],
                        "estimated_total": [est_low, est_high],
                        "cuts_count": "Packaging varies by processor",
                        "cooking_methods": ["roast", "grill", "smoke"],
                    }
                ],
            }
        )

    return {
        "meat_type": meat_type,
        "order_type": order_type,
        "live_weight": chosen_live_weight,
        "hanging_weight": [hanging_low, hanging_high],
        "finished_weight": [finished_low, finished_high],
        "total_estimated_cost": [total_low, total_high],
        "primal_cuts": primal_cuts,
        "processing_notes": [
            "These are planning estimates based on typical butcher yield.",
            "Final packaged weight depends on animal finish, trim preference, bone-in versus boneless requests, and processor style.",
            "We follow up directly before final processing to confirm details.",
        ],
    }


def parse_meat_type(order_text: str) -> Optional[str]:
    normalized = normalize_text(order_text)
    if any(token in normalized for token in ["hog", "pork", "pig"]):
        return "hog"
    if any(token in normalized for token in ["lamb", "sheep"]):
        return "lamb"
    return None


def parse_order_type(order_text: str) -> Optional[str]:
    normalized = normalize_text(order_text)
    if "whole" in normalized:
        return "whole"
    if "half" in normalized:
        return "half"
    return None


def derive_tags(order_text: str) -> List[str]:
    normalized = normalize_text(order_text)
    tags = []
    if any(token in normalized for token in ["whole", "half"]):
        tags.append("order-size")
    if any(token in normalized for token in ["hog", "pork", "pig"]):
        tags.append("hog")
    if any(token in normalized for token in ["lamb", "sheep"]):
        tags.append("lamb")
    if any(token in normalized for token in ["prior", "order history", "remember", "last order"]):
        tags.append("memory")
    if any(token in normalized for token in ["how", "what", "help", "which"]):
        tags.append("guidance")
    return tags


def get_matching_seed_knowledge(order_text: str) -> Optional[Dict[str, Any]]:
    normalized = normalize_text(order_text)
    for entry in SEED_KNOWLEDGE:
        if any(trigger in normalized for trigger in entry["triggers"]):
            return entry
    return None


async def ensure_assistant_seed_data() -> None:
    if db is None:
        return

    await db.visitor_profiles.create_index("session_id")
    await db.visitor_profiles.create_index("email", sparse=True)
    await db.butcher_learning.create_index("normalized_query")
    await db.butcher_knowledge.create_index("key", unique=True)

    for entry in SEED_KNOWLEDGE:
        existing = await db.butcher_knowledge.find_one({"key": entry["key"]})
        if existing:
            continue
        knowledge = ButcherKnowledgeEntry(**entry)
        doc = knowledge.model_dump()
        doc["created_at"] = _dt_to_iso(doc["created_at"])
        doc["updated_at"] = _dt_to_iso(doc["updated_at"])
        await db.butcher_knowledge.insert_one(doc)


async def prune_assistant_memory() -> None:
    if db is None:
        return

    pending_cutoff = _dt_to_iso(utc_now() - timedelta(days=45))
    await db.butcher_learning.update_many(
        {
            "status": "pending",
            "occurrence_count": {"$lte": 1},
            "last_seen_at": {"$lt": pending_cutoff},
        },
        {"$set": {"status": "pruned"}},
    )

    stale_knowledge_cutoff = _dt_to_iso(utc_now() - timedelta(days=90))
    await db.butcher_knowledge.update_many(
        {
            "source": "learned",
            "active": True,
            "helpful_count": {"$lte": 0},
            "unhelpful_count": {"$gte": 3},
            "last_used_at": {"$lt": stale_knowledge_cutoff},
        },
        {"$set": {"active": False, "updated_at": _dt_to_iso(utc_now())}},
    )


async def find_or_create_visitor_profile(
    session_id: str,
    visitor_name: Optional[str],
    visitor_email: Optional[str],
    visitor_phone: Optional[str],
    page_context: str,
) -> Dict[str, Any]:
    profile = None
    if visitor_email:
        profile = await db.visitor_profiles.find_one({"email": visitor_email}, {"_id": 0})
    if not profile:
        profile = await db.visitor_profiles.find_one({"session_id": session_id}, {"_id": 0})

    if profile:
        update_fields: Dict[str, Any] = {
            "session_id": session_id,
            "last_seen_at": _dt_to_iso(utc_now()),
            "updated_at": _dt_to_iso(utc_now()),
            "last_page_context": page_context,
        }
        if visitor_name:
            update_fields["name"] = visitor_name
        if visitor_email:
            update_fields["email"] = visitor_email
        if visitor_phone:
            update_fields["phone"] = visitor_phone
        await db.visitor_profiles.update_one({"id": profile["id"]}, {"$set": update_fields})
        profile.update(update_fields)
        return profile

    profile_obj = VisitorProfile(
        session_id=session_id,
        name=visitor_name,
        email=visitor_email,
        phone=visitor_phone,
        last_page_context=page_context,
    )
    doc = profile_obj.model_dump()
    doc["created_at"] = _dt_to_iso(doc["created_at"])
    doc["updated_at"] = _dt_to_iso(doc["updated_at"])
    doc["last_seen_at"] = _dt_to_iso(doc["last_seen_at"])
    await db.visitor_profiles.insert_one(doc)
    return doc


async def record_learning_signal(normalized_query: str, raw_query: str, session_id: str, page_context: str) -> None:
    existing = await db.butcher_learning.find_one({"normalized_query": normalized_query}, {"_id": 0})
    if existing:
        session_ids = list(existing.get("session_ids", []))
        if session_id not in session_ids:
            session_ids.append(session_id)
        await db.butcher_learning.update_one(
            {"id": existing["id"]},
            {
                "$set": {
                    "sample_query": raw_query,
                    "last_seen_at": _dt_to_iso(utc_now()),
                    "page_context": page_context,
                    "tags": derive_tags(raw_query),
                },
                "$inc": {"occurrence_count": 1},
                "$addToSet": {"session_ids": session_id},
            },
        )
        return

    record = ButcherLearningRecord(
        normalized_query=normalized_query,
        sample_query=raw_query,
        page_context=page_context,
        session_ids=[session_id],
        tags=derive_tags(raw_query),
    )
    doc = record.model_dump()
    doc["first_seen_at"] = _dt_to_iso(doc["first_seen_at"])
    doc["last_seen_at"] = _dt_to_iso(doc["last_seen_at"])
    await db.butcher_learning.insert_one(doc)


def build_order_summary(order: Dict[str, Any], product_lookup: Dict[str, str]) -> Dict[str, Any]:
    items = []
    for item in order.get("order_items", []):
        product_name = product_lookup.get(item.get("product_id"), item.get("product_id", "Product"))
        detail = f"{product_name} x {item.get('quantity', 0)}"
        if item.get("cut"):
            detail += f" ({item['cut']})"
        items.append(detail)
    return {
        "id": order.get("id"),
        "status": order.get("status", "pending"),
        "total_amount": order.get("total_amount", 0),
        "created_at": order.get("created_at"),
        "items": items,
    }


async def get_recalled_orders(visitor_email: Optional[str]) -> List[Dict[str, Any]]:
    if not visitor_email:
        return []

    product_docs = await db.products.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    product_lookup = {product["id"]: product.get("name", product["id"]) for product in product_docs}
    orders = await db.orders.find(
        {"customer_email": visitor_email},
        {"_id": 0},
    ).sort("created_at", -1).to_list(5)
    return [build_order_summary(order, product_lookup) for order in orders]


def compose_memory_blurb(profile: Dict[str, Any], recalled_orders: List[Dict[str, Any]]) -> str:
    name = profile.get("name")
    if recalled_orders:
        latest = recalled_orders[0]
        intro = f"Welcome back{f', {name}' if name else ''}. "
        return intro + f"I found {len(recalled_orders)} prior order(s). Your most recent order is {latest['status']} with a total of ${latest['total_amount']:.2f}."
    if name:
        return f"Thanks, {name}. I will use your name while we plan your order."
    return ""


async def sync_visitor_profile_from_order(database, order_data: Dict[str, Any]) -> None:
    email = order_data.get("customer_email")
    session_id = order_data.get("assistant_session_id")
    if not email and not session_id:
        return

    profile = None
    if email:
        profile = await database.visitor_profiles.find_one({"email": email}, {"_id": 0})
    if not profile and session_id:
        profile = await database.visitor_profiles.find_one({"session_id": session_id}, {"_id": 0})

    meat_types = []
    for item in order_data.get("order_items", []):
        product_id = item.get("product_id")
        if not product_id:
            continue
        product = await database.products.find_one({"id": product_id}, {"_id": 0, "category": 1, "type": 1})
        if product:
            meat_types.extend([value for value in [product.get("category"), product.get("type")] if value])

    update_fields = {
        "name": order_data.get("customer_name"),
        "email": email,
        "phone": order_data.get("customer_phone"),
        "last_seen_at": _dt_to_iso(utc_now()),
        "updated_at": _dt_to_iso(utc_now()),
        "last_page_context": "products",
    }

    if profile:
        await database.visitor_profiles.update_one(
            {"id": profile["id"]},
            {
                "$set": update_fields,
                "$addToSet": {
                    "prior_order_ids": order_data.get("id"),
                    "preferred_meat_types": {"$each": meat_types},
                },
                "$inc": {"total_conversations": 1},
            },
        )
        return

    profile_obj = VisitorProfile(
        session_id=session_id or f"order-{uuid.uuid4()}",
        name=order_data.get("customer_name"),
        email=email,
        phone=order_data.get("customer_phone"),
        prior_order_ids=[order_data.get("id")] if order_data.get("id") else [],
        preferred_meat_types=sorted(set(meat_types)),
        total_conversations=1,
    )
    doc = profile_obj.model_dump()
    doc["created_at"] = _dt_to_iso(doc["created_at"])
    doc["updated_at"] = _dt_to_iso(doc["updated_at"])
    doc["last_seen_at"] = _dt_to_iso(doc["last_seen_at"])
    await database.visitor_profiles.insert_one(doc)


def get_product_recommendation(meat_type: Optional[str], recalled_orders: List[Dict[str, Any]]) -> List[str]:
    if meat_type == "hog":
        return ["Estimate a whole hog", "How much freezer space for pork?", "Show me bacon and chops options"]
    if meat_type == "lamb":
        return ["Estimate a half lamb", "Show me lamb chop guidance", "What cuts come with a whole lamb?"]
    if recalled_orders:
        return ["Show me prior orders", "Help me reorder", "What is my best freezer plan?"]
    return ["I want a whole hog", "I want a half lamb", "How do I place an order?"]


def build_parse_reply(
    order_text: str,
    parsed_successfully: bool,
    meat_type: Optional[str],
    order_type: Optional[str],
    estimate_summary: Optional[Dict[str, Any]],
    memory_blurb: str,
    recalled_orders: List[Dict[str, Any]],
    knowledge_match: Optional[Dict[str, Any]],
) -> str:
    if parsed_successfully and meat_type and order_type:
        lines = [memory_blurb] if memory_blurb else []
        lines.append(f"Butch here. I read that as a {order_type} {meat_type} request.")
        if estimate_summary:
            lines.append(
                f"Estimated finished take-home cuts: {estimate_summary['finished_weight'][0]}-{estimate_summary['finished_weight'][1]} lbs."
            )
            lines.append(
                f"Estimated price range: ${estimate_summary['total_estimated_cost'][0]}-${estimate_summary['total_estimated_cost'][1]}."
            )
        lines.append("I can help you compare cuts, freezer space, or get you ready to place the order.")
        return "\n\n".join([line for line in lines if line])

    if knowledge_match:
        lines = [memory_blurb] if memory_blurb else []
        lines.append(knowledge_match["response"])
        return "\n\n".join(lines)

    if recalled_orders and any(token in normalize_text(order_text) for token in ["prior", "last order", "previous", "reorder"]):
        latest = recalled_orders[0]
        lines = [memory_blurb] if memory_blurb else ["I found your order history."]
        lines.append(
            f"Your latest order has {len(latest['items'])} line item(s): " + "; ".join(latest["items"]) + "."
        )
        lines.append("If you want, tell me whether you want to repeat that order, scale it up, or switch from hog to lamb.")
        return "\n\n".join(lines)

    return (
        (memory_blurb + "\n\n") if memory_blurb else ""
    ) + (
        "I can help with whole or half hog and lamb orders, cut planning, freezer-space questions, and prior-order recall. "
        "Tell me something like 'I want a whole hog', 'How much meat do I get from a half lamb?', or share your email so I can look up prior orders."
    )


@router.get("/butcher/cuts/{meat_type}")
async def get_butcher_cuts(meat_type: str):
    normalized_meat_type = normalize_text(meat_type)
    if normalized_meat_type not in BUTCHER_LIBRARY:
        raise HTTPException(status_code=404, detail="Meat type not found")

    cuts = []
    for cut in BUTCHER_LIBRARY[normalized_meat_type]["cuts"]:
        cuts.append(
            {
                "primal": cut["primal"],
                "name": cut["name"],
                "description": cut["description"],
                "price_per_lb": cut["price_per_lb"],
                "estimated_lbs": [1, max(2, round(10 * cut["yield_share"]))],
            }
        )
    return {"cuts": cuts}


@router.post("/butcher/calculate")
async def calculate_butcher_order(request: ButcherCalcRequest):
    estimate = build_cut_estimate(
        normalize_text(request.meat_type),
        normalize_text(request.order_type),
        request.live_weight,
    )
    return {"estimate": estimate}


@router.post("/butcher/parse")
async def parse_butcher_request(request: ButcherAssistantRequest):
    session_id = request.session_id or f"butch-{uuid.uuid4()}"
    normalized_query = normalize_text(request.order_text)
    if not normalized_query:
        raise HTTPException(status_code=400, detail="Order text is required")

    await ensure_assistant_seed_data()
    await prune_assistant_memory()

    profile = await find_or_create_visitor_profile(
        session_id=session_id,
        visitor_name=request.visitor_name,
        visitor_email=request.visitor_email,
        visitor_phone=request.visitor_phone,
        page_context=request.page_context,
    )
    recalled_orders = await get_recalled_orders(request.visitor_email)
    memory_blurb = compose_memory_blurb(profile, recalled_orders)
    meat_type = parse_meat_type(request.order_text)
    order_type = parse_order_type(request.order_text)
    knowledge_match = get_matching_seed_knowledge(request.order_text)

    parsed_successfully = bool(meat_type and order_type)
    estimate_summary = None
    if parsed_successfully:
        estimate_summary = build_cut_estimate(meat_type, order_type, None)
        await db.visitor_profiles.update_one(
            {"id": profile["id"]},
            {
                "$addToSet": {
                    "preferred_meat_types": meat_type,
                    "preferred_order_types": order_type,
                },
                "$set": {
                    "updated_at": _dt_to_iso(utc_now()),
                    "last_seen_at": _dt_to_iso(utc_now()),
                },
                "$inc": {"total_conversations": 1},
            },
        )
    else:
        await db.visitor_profiles.update_one(
            {"id": profile["id"]},
            {
                "$set": {
                    "updated_at": _dt_to_iso(utc_now()),
                    "last_seen_at": _dt_to_iso(utc_now()),
                },
                "$inc": {"total_conversations": 1},
            },
        )
        if not knowledge_match:
            await record_learning_signal(
                normalized_query=normalized_query,
                raw_query=request.order_text,
                session_id=session_id,
                page_context=request.page_context,
            )

    reply = build_parse_reply(
        order_text=request.order_text,
        parsed_successfully=parsed_successfully,
        meat_type=meat_type,
        order_type=order_type,
        estimate_summary=estimate_summary,
        memory_blurb=memory_blurb,
        recalled_orders=recalled_orders,
        knowledge_match=knowledge_match,
    )

    if knowledge_match:
        await db.butcher_knowledge.update_one(
            {"key": knowledge_match["key"]},
            {
                "$inc": {"use_count": 1},
                "$set": {
                    "last_used_at": _dt_to_iso(utc_now()),
                    "updated_at": _dt_to_iso(utc_now()),
                },
            },
        )

    await db.butcher_conversations.insert_one(
        {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "page_context": request.page_context,
            "visitor_name": request.visitor_name,
            "visitor_email": request.visitor_email,
            "user_message": request.order_text,
            "assistant_reply": reply,
            "parsed_successfully": parsed_successfully,
            "meat_type": meat_type,
            "order_type": order_type,
            "created_at": _dt_to_iso(utc_now()),
        }
    )

    return {
        "session_id": session_id,
        "reply": reply,
        "parsed_successfully": parsed_successfully,
        "meat_type": meat_type,
        "order_type": order_type,
        "estimate_available": bool(estimate_summary),
        "estimate_summary": estimate_summary,
        "suggestions": knowledge_match["suggestions"] if knowledge_match else get_product_recommendation(meat_type, recalled_orders),
        "visitor_profile": {
            "name": profile.get("name"),
            "email": profile.get("email"),
            "is_returning": bool(recalled_orders),
            "prior_order_count": len(recalled_orders),
        },
        "recalled_orders": recalled_orders,
    }


@router.post("/worker-chat/message")
async def worker_chat_message(request: ButcherAssistantRequest):
    parsed = await parse_butcher_request(request)
    return {
        "response": parsed["reply"],
        "intent": "product_assistant",
        "confidence": 0.84 if parsed["parsed_successfully"] else 0.58,
        "learning_id": None if parsed["parsed_successfully"] else slugify(request.order_text)[:20],
        "suggestions": parsed["suggestions"],
        "page_redirect": "/products" if request.page_context != "products" else None,
    }


@router.post("/worker-chat/feedback")
async def worker_chat_feedback(session_id: str, helpful: bool):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    latest = await db.butcher_conversations.find_one(
        {"session_id": session_id},
        sort=[("created_at", -1)],
    )
    if not latest:
        raise HTTPException(status_code=404, detail="Conversation session not found")

    if helpful:
        await db.butcher_conversations.update_one({"id": latest["id"]}, {"$set": {"helpful": True}})
    else:
        await db.butcher_conversations.update_one({"id": latest["id"]}, {"$set": {"helpful": False}})
    return {"message": "Feedback recorded"}


@router.get("/worker-chat/speak")
async def worker_chat_speak(text: str = Query(..., min_length=1)):
    return {"audio_url": None, "message": "Voice playback is not configured for this environment yet."}
