# Checkout_Module_v1/models.py

from pydantic import BaseModel, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import re
from sqlalchemy import Column, String, Float, Boolean, DateTime, JSON, Integer
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class AppType(str, Enum):
    alpha_certsig = "alpha_certsig"
    truemark_mint = "truemark_mint"
    other = "other"

class PaymentMethod(str, Enum):
    fiat = "fiat"
    crypto = "crypto"

class ChainTier(str, Enum):
    polygon = "polygon"
    ethereum = "ethereum"
    solana = "solana"

class ProductPydantic(BaseModel):  # For API requests
    id: str
    ppid: str
    app_type: str
    product_name: str
    category: str
    tier: str
    base_price_usd: float
    tax_category: str = "standard"  # e.g., "standard", "exempt"
    active: bool = True
    product_metadata: Optional[Dict[str, Any]] = None  # e.g., {"logo_url": "...", "lang_strings": {...}}

    @validator("ppid")
    @classmethod
    def validate_ppid(cls, v: str) -> str:
        if not re.match(r'^PP-[A-Z]{2,4}-[A-Z]{3}-[A-Z]{3}-\d{3}$', v):
            raise ValueError("Invalid PPID format: PP-APP-CAT-TIER-VERSION")
        return v

class CouponPydantic(BaseModel):
    code: str
    discount_type: str  # "percent" or "fixed"
    discount_value: float
    target_apps: List[str]
    source_apps: Optional[List[str]] = None
    max_uses: Optional[int] = None
    expiry_date: Optional[datetime] = None
    coupon_metadata: Optional[Dict[str, Any]] = None

class Coupon(Base):
    __tablename__ = "coupons"
    code = Column(String, primary_key=True)
    discount_type = Column(String)
    discount_value = Column(Float)
    target_apps = Column(String)  # JSON for SQLite
    source_apps = Column(String, nullable=True)
    max_uses = Column(Integer, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    uses_count = Column(Integer, default=0)
    coupon_metadata = Column(JSON, nullable=True)

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True)
    ppid = Column(String, unique=True, nullable=False)
    app_type = Column(String, nullable=False)
    product_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    tier = Column(String, nullable=False)
    base_price_usd = Column(Float, nullable=False)
    tax_category = Column(String, default="standard")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    product_metadata = Column(JSON, nullable=True)

class OrderDB(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True)
    order_id = Column(String, unique=True, index=True)
    product_id = Column(String, index=True)  # PPID
    app_type = Column(String)
    final_price_usd = Column(Float)
    tax_amount = Column(Float, default=0.0)
    spot_price_usd = Column(Float, nullable=True)  # For crypto tax compliance
    payment_method = Column(String)
    chain_tier = Column(String, nullable=True)
    status = Column(String, default="pending")
    tx_hash = Column(String, nullable=True)
    block_number = Column(Integer, nullable=True)
    block_hash = Column(String, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    stripe_session_id = Column(String, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)

class OrderCreate(BaseModel):
    product_id: str  # PPID
    final_price_usd: float
    customer_email: str
    payment_method: PaymentMethod
    wallet_address: Optional[str] = None
    crypto_type: Optional[str] = None
    chain_tier: Optional[ChainTier] = ChainTier.polygon
    coupon_code: Optional[str] = None
    source_app: Optional[str] = None  # For coupon validation
    metadata: Optional[Dict[str, Any]] = None


class OrderRecord(BaseModel):
    order_id: str
    product_id: str  # PPID
    app_type: str
    final_price_usd: float
    tax_amount: float = 0.0
    spot_price_usd: Optional[float] = None
    payment_method: Optional[str] = None
    chain_tier: Optional[str] = None
    status: str
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    block_hash: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime
    stripe_session_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    serial_number: Optional[str] = None