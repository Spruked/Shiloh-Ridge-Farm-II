from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import verify_token
import substrate_service as substrate
from shep_tool_registry import describe_tools


router = APIRouter(prefix="/orb/substrate", tags=["Shep Substrate"])


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500)
    limit: int = Field(8, ge=1, le=50)


class ScanRequest(BaseModel):
    max_files: Optional[int] = Field(None, ge=1)


class OCRRequest(BaseModel):
    relative_path: str
    page_number: Optional[int] = Field(None, ge=1)
    language: str = "eng"
    force: bool = False


class EscalationRequest(BaseModel):
    conversation_id: Optional[str] = None
    request_id: Optional[str] = None
    user_request: str
    interpreted_intent: str = "ESCALATE"
    reason: str
    priority: str = "normal"
    confidence: float = Field(0.0, ge=0, le=1)
    evidence: list[Dict[str, Any]] = Field(default_factory=list)


class ResolutionRequest(BaseModel):
    resolution: str = Field(..., min_length=2)


@router.get("/health")
async def substrate_health():
    health = substrate.health()
    return {key: value for key, value in health.items() if key not in {"substrate_root", "mesh_root", "derived_root"}}


@router.get("/tools", dependencies=[Depends(verify_token)])
async def substrate_tools():
    return {"tools": describe_tools(), "policy": {"public": ["substrate.health", "substrate.search", "escalation.create"], "admin_only": ["substrate.inventory", "substrate.list_sources", "substrate.read", "substrate.get_pointer", "substrate.ocr", "substrate.scan_status", "escalation.list", "escalation.read", "escalation.resolve"]}}


@router.post("/search")
async def substrate_search(request: SearchRequest):
    result = substrate.search(request.query, request.limit)
    # Public responses retain stable pointers but not raw absolute paths.
    return result


@router.get("/scan-status", dependencies=[Depends(verify_token)])
async def substrate_scan_status():
    return substrate.scan_status()


@router.post("/scan", dependencies=[Depends(verify_token)])
async def substrate_scan(request: ScanRequest):
    return substrate.scan_substrate(request.max_files)


@router.get("/sources", dependencies=[Depends(verify_token)])
async def substrate_sources(limit: int = 100, source_type: Optional[str] = None):
    return substrate.list_sources(limit, source_type)


@router.get("/source", dependencies=[Depends(verify_token)])
async def substrate_source(relative_path: str, page_number: Optional[int] = None, chunk_id: Optional[str] = None):
    try:
        return substrate.read_source(relative_path, page_number, chunk_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/ocr", dependencies=[Depends(verify_token)])
async def substrate_ocr(request: OCRRequest):
    try:
        return substrate.ocr(request.relative_path, request.page_number, request.language, request.force)
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/escalations")
async def create_escalation(request: EscalationRequest):
    return substrate.create_escalation(request.model_dump())


@router.get("/escalations", dependencies=[Depends(verify_token)])
async def escalations(status: Optional[str] = "open"):
    return {"escalations": substrate.list_escalations(status)}


@router.get("/escalations/{escalation_id}", dependencies=[Depends(verify_token)])
async def escalation(escalation_id: str):
    try:
        return substrate.get_escalation(escalation_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/escalations/{escalation_id}/resolve", dependencies=[Depends(verify_token)])
async def resolve_escalation(escalation_id: str, request: ResolutionRequest, username: str = Depends(verify_token)):
    try:
        return substrate.resolve_escalation(escalation_id, request.resolution, username)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

