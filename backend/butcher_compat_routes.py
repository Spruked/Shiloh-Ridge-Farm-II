"""Meat calculator API: /api/butcher/calculate and /api/butcher/cuts/{meat_type}."""
import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

try:
    from . import market_data, meat_calculator
except ImportError:  # imported as a top-level module
    import meat_calculator
    import market_data

router = APIRouter(prefix="/butcher", tags=["Butcher Compatibility"])


class CalculateRequest(BaseModel):
    meat_type: str
    order_type: str
    live_weight: Optional[float] = Field(default=None, description="Weight of the whole animal, in lbs")


@router.post("/calculate")
async def calculate_cuts(request: CalculateRequest):
    meat_type = (request.meat_type or "").lower().strip()
    order_type = (request.order_type or "").lower().strip()
    if meat_type not in meat_calculator.PROFILES:
        raise HTTPException(status_code=400, detail="meat_type must be hog or lamb")
    if order_type not in ("whole", "half"):
        raise HTTPException(status_code=400, detail="order_type must be whole or half")
    weight = request.live_weight
    if weight is not None and not (20 <= weight <= 1500):
        raise HTTPException(status_code=400, detail="live_weight must be between 20 and 1500 lbs")
    market = await asyncio.to_thread(market_data.multiplier, meat_type)
    return {"estimate": meat_calculator.estimate(meat_type, order_type, weight, market)}


@router.get("/cuts/{meat_type}")
async def get_cut_guide(meat_type: str):
    mt = (meat_type or "").lower().strip()
    if mt not in meat_calculator.PROFILES:
        raise HTTPException(status_code=400, detail="meat_type must be hog or lamb")
    return {"cuts": meat_calculator.cut_guide(mt)}
