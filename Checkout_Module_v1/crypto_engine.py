# Checkout_Module_v1/crypto_engine.py

import requests
import time
from config import settings

COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price"

def get_token_price(token_id: str = "matic-network") -> float:
    response = requests.get(
        COINGECKO_API,
        params={"ids": token_id, "vs_currencies": "usd"}
    )
    data = response.json()
    if token_id in data and "usd" in data[token_id]:
        return data[token_id]["usd"]
    else:
        # Fallback for demo
        if token_id == "matic-network":
            return 0.5  # Mock price
        elif token_id == "ethereum":
            return 2000.0
        elif token_id == "solana":
            return 20.0
        else:
            return 1.0


def convert_usd_to_token(usd_amount: float, token_price: float) -> float:
    return round(usd_amount / token_price, 6)


def json_rpc_call(method: str, params: list, rpc_url: str) -> dict:
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1
    }
    response = requests.post(rpc_url, json=payload)
    response.raise_for_status()
    result = response.json()
    if "error" in result:
        raise Exception(f"RPC Error: {result['error']}")
    return result["result"]


def verify_transaction(tx_hash: str, chain: str = "polygon_zkevm") -> dict:
    """
    Verify a transaction on the blockchain using raw JSON-RPC.
    
    Returns a proof object with transaction and block details.
    """
    rpc_url = settings.POLYGON_RPC  # Assuming polygon_zkevm uses this
    
    # Step 1: Get transaction receipt
    receipt = json_rpc_call("eth_getTransactionReceipt", [tx_hash], rpc_url)
    
    if not receipt:
        return {"status": "pending", "message": "Transaction not found"}
    
    status = receipt.get("status")
    block_number_hex = receipt.get("blockNumber")
    
    if status != "0x1" or not block_number_hex:
        return {"status": "pending", "message": "Transaction not confirmed"}
    
    block_number = int(block_number_hex, 16)
    
    # Step 2: Get block details
    block = json_rpc_call("eth_getBlockByNumber", [hex(block_number), False], rpc_url)
    
    if not block:
        return {"status": "error", "message": "Block not found"}
    
    block_hash = block.get("hash")
    timestamp_hex = block.get("timestamp")
    timestamp = int(timestamp_hex, 16) if timestamp_hex else None
    gas_used = block.get("gasUsed")
    base_fee_per_gas = block.get("baseFeePerGas")
    
    # Return structured proof
    return {
        "status": "confirmed",
        "tx_hash": tx_hash,
        "block_number": block_number,
        "block_hash": block_hash,
        "timestamp": timestamp,
        "gas_used": gas_used,
        "base_fee_per_gas": base_fee_per_gas,
        "chain": chain
    }