# Checkout_Module_v1/config.py

import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = "Pro Prime Checkout Plugin"

    # Stripe
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
    STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "http://localhost:8000/success?order_id={CHECKOUT_SESSION_ID}")
    STRIPE_CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "http://localhost:8000/cancel")

    # Alchemy API
    ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")

    # Crypto RPCs via Alchemy
    POLYGON_RPC = f"https://polygonzkevm-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}" if ALCHEMY_API_KEY else None
    ETHEREUM_RPC = f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}" if ALCHEMY_API_KEY else None
    SOLANA_RPC = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}" if ALCHEMY_API_KEY else None

    TREASURY_ADDRESS = os.getenv("APEX_TREASURY_ADDRESS")
    TREASURY_PRIVATE_KEY = os.getenv("APEX_TREASURY_PRIVATE_KEY")  # Encrypted in production
    SOLANA_TREASURY_PRIVATE_KEY = os.getenv("SOLANA_TREASURY_PRIVATE_KEY")  # Base58 encoded

    # Pricing
    BASE_CURRENCY = "USD"

    # PPID App Code Mapping
    APP_CODE_MAP = {
        "AC": "alpha_certsig",
        "TM": "truemark_mint",
        "GO": "goat",
        "VF": "vault_forge",
        "AD": "apex_doc",
    }

settings = Settings()