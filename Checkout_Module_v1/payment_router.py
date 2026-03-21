# Checkout_Module_v1/payment_router.py

import stripe
from pricing_engine import validate_chain_premium
from crypto_engine import verify_transaction
from mint_executor import mint_certificate
from config import settings
from order_ledger import log_order, get_next_serial
from datetime import datetime
import uuid
from models import Product
from database import SessionLocal
from sqlalchemy.orm import Session
from sqlalchemy import func

stripe.api_key = settings.STRIPE_SECRET_KEY

CHAIN_TOKENS = {
    "polygon": ("matic-network", "MATIC"),
    "ethereum": ("ethereum", "ETH"),
    "solana": ("solana", "SOL")
}

def process_payment(order, db: Session, product, app_type: str, tax_amount: float = 0.0):
    final_price = order.final_price_usd
    if final_price <= 0:
        return {"status": "error", "message": "Invalid price"}

    # Product already fetched
    product_name = product.product_name

    # Optional validation
    validate_chain_premium(final_price, order.chain_tier.value if order.chain_tier else None, product.app_type)

    order_id = str(uuid.uuid4())

    is_minting_app = app_type in ["alpha_certsig", "truemark_mint"]

    if order.payment_method.value == "fiat":
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                "product_data": {
                    "name": f"{product_name} ({order.chain_tier.value.title() if order.chain_tier else 'N/A'})",
                    "description": f"App: {product.app_type}",
                },
                        "unit_amount": int(final_price * 100),  # cents
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=settings.STRIPE_SUCCESS_URL.format(CHECKOUT_SESSION_ID="{CHECKOUT_SESSION_ID}"),
                cancel_url=settings.STRIPE_CANCEL_URL,
                customer_email=order.customer_email,
                metadata={
                    "order_id": order_id,
                    "app_type": app_type,
                    "chain_tier": order.chain_tier.value if order.chain_tier else None,
                    "product_id": order.product_id,
                    "product_name": product_name,
                    **(order.metadata or {})
                },
                expires_at=int((datetime.utcnow().timestamp() + 1800)),
            )

            return {
                "order_id": order_id,
                "status": "fiat_pending",
                "checkout_url": session.url,
                "stripe_session_id": session.id,
                "amount_usd": final_price,
                "chain_tier": order.chain_tier.value if order.chain_tier else None,
            }

        except stripe.error.StripeError as e:
            return {"status": "error", "message": f"Stripe error: {e.user_message}"}

    elif order.payment_method.value == "crypto":
        # Only allow crypto for minting apps
        if not is_minting_app:
            return {"status": "error", "message": "Crypto payments only available for minting apps"}
        
        token_id, token_symbol = CHAIN_TOKENS.get(order.chain_tier.value if order.chain_tier else "polygon", ("matic-network", "MATIC"))
        token_price = get_token_price(token_id)
        token_amount = convert_usd_to_token(final_price, token_price)

        return {
            "status": "crypto_quote",
            "usd_price": final_price,
            "token": token_symbol,
            "token_price_usd": token_price,
            "token_amount_due": token_amount
        }

    else:
        return {"status": "error", "message": "Invalid payment method"}

def confirm_payment(order_id: str, order, app_type: str, product):
    final_price = order.final_price_usd
    usd_value_at_payment = final_price

    is_minting_app = app_type in ["alpha_certsig", "truemark_mint"]

    if order.payment_method.value == "crypto" and order.wallet_address and is_minting_app:
        token_id, token_symbol = CHAIN_TOKENS.get(order.chain_tier.value if order.chain_tier else "polygon", ("matic-network", "MATIC"))
        token_price = get_token_price(token_id)
        token_amount = convert_usd_to_token(final_price, token_price)
        
        # Generate serial for minting
        serial = get_next_serial(order.product_id)
        token_uri = f"https://apex.com/certificates/{serial}"
        
        mint_result = mint_certificate(order.chain_tier.value if order.chain_tier else "polygon", order.wallet_address, token_uri)

        # Calculate gas cost (rough estimate)
        gas_price_wei = 20000000000  # 20 gwei example
        gas_cost_usd = (mint_result["gas_used"] * gas_price_wei) / 1e18 * token_price

        # Verify transaction on blockchain
        proof = verify_transaction(mint_result["tx_hash"], "polygon_zkevm")
        status = proof.get("status", "pending")
        block_number = proof.get("block_number")
        block_hash = proof.get("block_hash")
        confirmed_at = datetime.utcnow() if status == "confirmed" else None

        log_order(
            order_id=order_id,
            product_id=order.product_id,
            app_type=app_type,
            final_price_usd=final_price,
            tax_amount=tax_amount,
            spot_price_usd=token_price,  # Record spot price for tax compliance
            payment_method="crypto",
            chain_tier=order.chain_tier.value if order.chain_tier else None,
            status=status,
            tx_hash=mint_result["tx_hash"],
            block_number=block_number,
            block_hash=block_hash,
            confirmed_at=confirmed_at,
            serial_number=serial
        )

        return {
            "status": status,
            "mint_details": mint_result,
            "proof": proof
        }
    elif order.payment_method.value == "fiat":
        log_order(
            order_id=order_id,
            product_id=order.product_id,
            app_type=app_type,
            final_price_usd=final_price,
            tax_amount=tax_amount,
            payment_method="fiat",
            status="paid"
        )
        return {"status": "fiat_confirmed"}
    else:
        return {"status": "error"}