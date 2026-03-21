# Checkout_Module_v1/pricing_engine.py
# Optional validation for chain premiums (not required for pricing)

import logging
from typing import Optional
logger = logging.getLogger(__name__)

CHAIN_CONFIG = {
    "polygon": {"premium_usd": 0.0},
    "ethereum": {"premium_usd": 5.0},
    "solana": {"premium_usd": 2.0}
}

def validate_chain_premium(final_price_usd: float, chain_tier: Optional[str], app_type: str) -> None:
    if not chain_tier or app_type not in ["alpha_certsig", "truemark_mint"]:
        return  # Non-minting or no chain → no check
    
    expected_premium = CHAIN_CONFIG.get(chain_tier, {}).get("premium_usd", 0.0)
    # Optional: warn in logs if final_price seems too low (but don't enforce)
    if final_price_usd < expected_premium:
        logger.warning(f"Low price for {chain_tier} mint: ${final_price_usd} (expected premium ${expected_premium})")