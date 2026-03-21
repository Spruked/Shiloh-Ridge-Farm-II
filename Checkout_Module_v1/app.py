# Checkout_Module_v1/app.py

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from models import OrderCreate, ProductPydantic, CouponPydantic, Base
from payment_router import process_payment, confirm_payment
from order_ledger import register_product, get_product, create_coupon, get_coupon, apply_coupon, get_ledger
from config import settings
from datetime import datetime
import uuid
import stripe
from database import engine, SessionLocal
from sqlalchemy.orm import Session
import json

stripe.api_key = settings.STRIPE_SECRET_KEY

# Database setup (SQLite for demo)
from database import engine
from sqlalchemy.orm import sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Drop and recreate tables for schema updates (demo only)
from models import Base
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/admin")
def admin_dashboard():
    return FileResponse("admin.html")

@app.post("/register-product")
def register_product_endpoint(product: ProductPydantic):
    # TODO: Auth via X-App-Key header
    try:
        registered = register_product(product.model_dump())
        return {"status": "registered", "product": registered.ppid}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/create-coupon")
def create_coupon_endpoint(coupon: CouponPydantic):
    # TODO: Admin auth
    try:
        created = create_coupon(coupon.model_dump())
        return {"status": "created", "coupon": created.code}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Temporary in-memory storage
orders = {}

@app.post("/checkout")
def checkout(order: OrderCreate, db: Session = Depends(get_db)):
    try:
        # Validate product
        product = get_product(order.product_id)
        if not product:
            raise HTTPException(status_code=400, detail="Invalid product ID")

        # Infer app_type from PPID
        try:
            app_code = order.product_id.split('-')[1]
            inferred_app_type = settings.APP_CODE_MAP[app_code]
        except (IndexError, KeyError):
            raise HTTPException(status_code=400, detail="Invalid PPID structure or unknown app code")

        # Check ownership
        if inferred_app_type != product.app_type:
            raise HTTPException(status_code=403, detail="Product belongs to a different app")

        # Apply coupon if provided
        effective_base = product.base_price_usd
        if order.coupon_code:
            coupon = get_coupon(order.coupon_code)
            if not coupon:
                raise HTTPException(status_code=400, detail="Invalid coupon")
            try:
                effective_base = apply_coupon(coupon, effective_base, inferred_app_type, order.source_app)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        # Calculate tax (US only, simplified)
        tax_rate = 0.08 if product.tax_category == "standard" else 0.0
        tax_amount = effective_base * tax_rate
        expected_total = effective_base + tax_amount

        # Check price variance (penny rounding tolerance)
        price_diff = abs(order.final_price_usd - expected_total)
        if price_diff > 0.01:  # $0.01 tolerance for rounding
            raise HTTPException(status_code=400, detail="Price variance too high")

        result = process_payment(order, db, product, inferred_app_type, tax_amount)
        order_id = result.get("order_id", str(uuid.uuid4()))
        orders[order_id] = {"order": order, "app_type": inferred_app_type, "product": product}

        # Customize response
        response = {
            "order_id": order_id,
            "timestamp": datetime.utcnow().isoformat(),
            "payment_details": result,
            "product_name": product.product_name,
            "subtotal_usd": effective_base,
            "tax_amount_usd": tax_amount,
            "total_usd": expected_total,
            "logo_url": product.product_metadata.get("logo_url") if product.product_metadata else None,
            "custom_msg": (product.product_metadata.get("lang_strings", {}).get("checkout_msg") if product.product_metadata else None) or "Proceeding to payment..."
        }
        return response
    except Exception as e:
        print(f"Error in checkout: {e}")
        raise

@app.post("/confirm/{order_id}")
def confirm(order_id: str):
    if order_id not in orders:
        return {"status": "error", "message": "Order not found"}

    order_data = orders[order_id]
    order = order_data["order"]
    app_type = order_data["app_type"]
    product = order_data["product"]
    result = confirm_payment(order_id, order, app_type, product)

    return {
        "order_id": order_id,
        "timestamp": datetime.utcnow().isoformat(),
        "confirmation_details": result
    }

@app.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        order_id = session["metadata"].get("order_id")
        if order_id and order_id in orders:
            order = orders[order_id]
            metadata = session["metadata"]
            result = confirm_payment(order_id, order, metadata)
            # Update order with stripe info if needed

    return {"status": "success"}

@app.get("/success")
def success(order_id: str = None):
    if order_id:
        return {"message": f"Payment successful! Minting certificate for order {order_id}"}
    return {"message": "Payment successful"}

@app.get("/cancel")
def cancel():
    return {"message": "Payment cancelled"}

@app.get("/admin/products")
def list_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return [{"id": p.id, "ppid": p.ppid, "app_type": p.app_type, "product_name": p.product_name, "base_price_usd": p.base_price_usd, "tax_category": p.tax_category, "active": p.active} for p in products]

@app.get("/admin/coupons")
def list_coupons(db: Session = Depends(get_db)):
    coupons = db.query(Coupon).all()
    result = []
    for c in coupons:
        result.append({
            "code": c.code,
            "discount_type": c.discount_type,
            "discount_value": c.discount_value,
            "target_apps": json.loads(c.target_apps),
            "source_apps": json.loads(c.source_apps) if c.source_apps else None,
            "max_uses": c.max_uses,
            "uses_count": c.uses_count,
            "expiry_date": c.expiry_date
        })
    return result

@app.get("/admin/orders")
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(OrderDB).all()
    return [{"order_id": o.order_id, "product_id": o.product_id, "app_type": o.app_type, "subtotal_usd": o.final_price_usd - o.tax_amount, "tax_amount_usd": o.tax_amount, "total_usd": o.final_price_usd, "status": o.status, "tx_hash": o.tx_hash, "block_number": o.block_number, "block_hash": o.block_hash, "confirmed_at": o.confirmed_at} for o in orders]