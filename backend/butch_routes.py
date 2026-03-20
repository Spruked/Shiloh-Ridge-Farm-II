from dataclasses import asdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import verify_token
from butch_core import CustomerProfile, butch_skg
from butch_voice import butch_voice


router = APIRouter(prefix="/butch", tags=["Butch SKG"])


class ChatRequest(BaseModel):
    message: str
    customer_id: str
    customer_context: Dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    text: str
    audio_url: Optional[str] = None
    loyalty_tier: str
    suggestions: List[str] = Field(default_factory=list)
    available_discounts: List[Dict[str, Any]] = Field(default_factory=list)
    customer_id: str
    voice_available: bool = False
    voice_backend: Optional[str] = None
    use_browser_tts: bool = False
    acp_settings: Dict[str, Any] = Field(default_factory=dict)
    aacp_settings: Dict[str, Any] = Field(default_factory=dict)


class AdminPromoRequest(BaseModel):
    code: str
    discount_percent: float
    applicable_cuts: List[str]
    authorized_by: str


class OrderRecordRequest(BaseModel):
    customer_id: str
    order_details: Dict[str, Any]


def _serialize_profile(profile: CustomerProfile) -> Dict[str, Any]:
    data = asdict(profile)
    if isinstance(data.get("last_visit"), datetime):
        data["last_visit"] = data["last_visit"].isoformat()
    return data


def _resolve_customer_id(customer_id: str, context: Dict[str, Any]) -> str:
    email = (context.get("email") or "").strip().lower()
    if customer_id in butch_skg.customer_profiles:
        return customer_id

    if email:
        email_key = f"email:{email}"
        if email_key in butch_skg.customer_profiles:
            return email_key

        for existing_id, profile in butch_skg.customer_profiles.items():
            if profile.email.strip().lower() == email:
                return existing_id
        return email_key

    return customer_id


def _lookup_customer_profile(search_value: str) -> Optional[CustomerProfile]:
    if search_value in butch_skg.customer_profiles:
        return butch_skg.customer_profiles[search_value]

    normalized = search_value.strip().lower()
    for profile in butch_skg.customer_profiles.values():
        if profile.email.strip().lower() == normalized:
            return profile
        if profile.name.strip().lower() == normalized:
            return profile
    return None


@router.post("/chat", response_model=ChatResponse)
async def chat_with_butch(request: ChatRequest):
    resolved_customer_id = _resolve_customer_id(request.customer_id, request.customer_context)
    result = await butch_skg.process_interaction(
        resolved_customer_id,
        request.message,
        request.customer_context,
    )
    audio_result = await butch_voice.synthesize(
        result["text"],
        resolved_customer_id,
        result["acp_settings"],
    )
    return ChatResponse(
        text=result["text"],
        audio_url=audio_result.get("audio_url"),
        loyalty_tier=result["loyalty_tier"],
        suggestions=result["suggested_cuts"],
        available_discounts=result["available_discounts"],
        customer_id=resolved_customer_id,
        voice_available=audio_result.get("available", False),
        voice_backend=audio_result.get("backend_used"),
        use_browser_tts=audio_result.get("use_browser_tts", True),
        acp_settings=result["acp_settings"],
        aacp_settings=result["acp_settings"],
    )


@router.get("/customer/{customer_id}")
async def get_customer_memory(customer_id: str, username: str = Depends(verify_token)):
    profile = _lookup_customer_profile(customer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found")

    memory_nodes = [
        memory for memory in butch_skg.episodic_memory if memory.customer_id == profile.id
    ]
    return {
        "profile": _serialize_profile(profile),
        "interaction_count": profile.interaction_count,
        "total_spent": sum(order.get("total", 0) for order in profile.order_history),
        "memory_nodes": len(memory_nodes),
        "recent_orders": profile.order_history[-5:],
        "preferred_cuts": profile.preferred_cuts,
    }


@router.post("/admin/promo")
async def add_promotion(request: AdminPromoRequest, username: str = Depends(verify_token)):
    success = butch_skg.add_promo_code(
        request.code,
        request.discount_percent,
        request.applicable_cuts,
        request.authorized_by,
    )
    if not success:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return {"status": "promo_added", "code": request.code, "activated_by": username}


@router.post("/admin/record-order")
async def record_order(request: OrderRecordRequest, username: str = Depends(verify_token)):
    butch_skg.record_order(request.customer_id, request.order_details)
    return {"status": "order_recorded", "recorded_by": username}


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "memory_nodes": len(butch_skg.episodic_memory),
        "customer_profiles": len(butch_skg.customer_profiles),
        "last_pruning": butch_skg.last_pruning.isoformat(),
        "owner": butch_skg.owner_config["name"],
        "voice": butch_voice.describe_backend(),
    }
