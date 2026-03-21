# Checkout_Module_v1/order_ledger.py

from models import OrderRecord, OrderDB, Product, ProductPydantic, Coupon, CouponPydantic
from database import SessionLocal
from datetime import datetime
import json
import uuid
from sqlalchemy import func, Integer
import json
from typing import Optional

# Temporary in-memory ledger (for now)
ledger = []

def log_order(order_id: str, product_id: str, app_type: str, final_price_usd: float, tax_amount: float = 0.0, spot_price_usd: Optional[float] = None, payment_method: Optional[str] = None, chain_tier: Optional[str] = None, status: str = "pending", tx_hash: Optional[str] = None, block_number: Optional[int] = None, block_hash: Optional[str] = None, confirmed_at: Optional[datetime] = None, stripe_session_id: Optional[str] = None, stripe_payment_intent_id: Optional[str] = None, serial_number: Optional[str] = None):
    db = SessionLocal()
    try:
        db_order = OrderDB(
            id=str(uuid.uuid4()),
            order_id=order_id,
            product_id=product_id,
            app_type=app_type,
            final_price_usd=final_price_usd,
            tax_amount=tax_amount,
            spot_price_usd=spot_price_usd,
            payment_method=payment_method,
            chain_tier=chain_tier,
            status=status,
            tx_hash=tx_hash,
            block_number=block_number,
            block_hash=block_hash,
            confirmed_at=confirmed_at,
            stripe_session_id=stripe_session_id,
            stripe_payment_intent_id=stripe_payment_intent_id,
            serial_number=serial_number
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
    finally:
        db.close()

    # Also keep in memory for now
    record = OrderRecord(
        order_id=order_id,
        product_id=product_id,
        app_type=app_type,
        final_price_usd=final_price_usd,
        tax_amount=tax_amount,
        spot_price_usd=spot_price_usd,
        payment_method=payment_method,
        chain_tier=chain_tier,
        status=status,
        tx_hash=tx_hash,
        block_number=block_number,
        block_hash=block_hash,
        confirmed_at=confirmed_at,
        created_at=datetime.utcnow(),
        stripe_session_id=stripe_session_id,
        stripe_payment_intent_id=stripe_payment_intent_id,
        serial_number=serial_number
    )
    ledger.append(record)

def register_product(product_data: dict):
    db = SessionLocal()
    try:
        ppid = product_data["ppid"]
        if db.query(Product).filter(Product.ppid == ppid).first():
            raise ValueError("PPID already registered")
        db_product = Product(**product_data)
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    finally:
        db.close()

def get_product(ppid: str):
    db = SessionLocal()
    try:
        return db.query(Product).filter(Product.ppid == ppid).first()
    finally:
        db.close()

def get_next_serial(ppid: str) -> str:
    db = SessionLocal()
    try:
        current_year = datetime.utcnow().year
        # Get max counter for this PPID/year
        result = db.query(func.max(func.cast(func.substr(OrderDB.serial_number, -6), Integer))).filter(
            OrderDB.product_id == ppid,
            func.substr(OrderDB.serial_number, -11, 4) == str(current_year)
        ).scalar()
        max_counter = result or 0
        counter = max_counter + 1
        return f"{ppid}-{current_year}-{counter:06d}"
    finally:
        db.close()

def create_coupon(coupon_data: dict):
    db = SessionLocal()
    try:
        code = coupon_data["code"]
        if db.query(Coupon).filter(Coupon.code == code).first():
            raise ValueError("Coupon already exists")
        # Convert lists to JSON for SQLite
        coupon_data["target_apps"] = json.dumps(coupon_data["target_apps"])
        if "source_apps" in coupon_data and coupon_data["source_apps"]:
            coupon_data["source_apps"] = json.dumps(coupon_data["source_apps"])
        db_coupon = Coupon(**coupon_data)
        db.add(db_coupon)
        db.commit()
        db.refresh(db_coupon)
        return db_coupon
    finally:
        db.close()

def get_coupon(code: str):
    db = SessionLocal()
    try:
        coupon = db.query(Coupon).filter(Coupon.code == code).first()
        if coupon:
            coupon.target_apps = json.loads(getattr(coupon, "target_apps"))
            if getattr(coupon, "source_apps", None) not in (None, ""):
                coupon.source_apps = json.loads(getattr(coupon, "source_apps"))
        return coupon
    finally:
        db.close()

def apply_coupon(coupon, base_price: float, app_type: str, source_app: Optional[str]) -> float:
    if coupon.expiry_date and coupon.expiry_date < datetime.utcnow():
        raise ValueError("Coupon expired")
    if coupon.max_uses and coupon.uses_count >= coupon.max_uses:
        raise ValueError("Coupon max uses reached")
    if app_type not in coupon.target_apps:
        raise ValueError("Coupon not applicable to this app")
    if coupon.source_apps and source_app not in coupon.source_apps:
        raise ValueError("Coupon not redeemable from this source")

    if coupon.discount_type == "percent":
        discount = base_price * (coupon.discount_value / 100)
    else:
        discount = coupon.discount_value
    final = max(0, base_price - discount)
    coupon.uses_count += 1
    return final

def get_ledger():
    return ledger