# Checkout_Module_v1/mint_executor.py

from web3 import Web3
from config import settings
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.system_program import TransferParams, transfer
from solders.pubkey import Pubkey
import json
import base64

# Assuming a simple ERC721 contract ABI for minting
CONTRACT_ABI = json.loads('''[
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "string", "name": "tokenURI", "type": "string"}
        ],
        "name": "mint",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]''')

# Contract addresses for each chain
CONTRACT_ADDRESSES = {
    "polygon": "0xYourPolygonContractAddress",
    "ethereum": "0xYourEthereumContractAddress",
    "solana": "YourSolanaProgramId"  # For Solana, program ID
}

def get_w3(chain: str):
    if chain == "polygon":
        return Web3(Web3.HTTPProvider(settings.POLYGON_RPC))
    elif chain == "ethereum":
        return Web3(Web3.HTTPProvider(settings.ETHEREUM_RPC))
    else:
        raise ValueError("Unsupported chain for EVM")

def mint_evm_certificate(chain: str, wallet_address: str, token_uri: str):
    w3 = get_w3(chain)
    if not w3.is_connected():
        raise Exception(f"Cannot connect to {chain} RPC")

    contract_address = CONTRACT_ADDRESSES[chain]
    contract = w3.eth.contract(address=contract_address, abi=CONTRACT_ABI)
    treasury_account = w3.eth.account.from_key(settings.TREASURY_PRIVATE_KEY)

    # Build transaction
    tx = contract.functions.mint(wallet_address, token_uri).build_transaction({
        'from': settings.TREASURY_ADDRESS,
        'nonce': w3.eth.get_transaction_count(settings.TREASURY_ADDRESS),
        'gas': 200000,
        'gasPrice': w3.eth.gas_price
    })

    # Sign and send
    signed_tx = w3.eth.account.sign_transaction(tx, settings.TREASURY_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

    # Wait for confirmation
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    return {
        "tx_hash": tx_hash.hex(),
        "gas_used": receipt.gasUsed,
        "status": "success" if receipt.status == 1 else "failed"
    }

def mint_solana_certificate(wallet_address: str, token_uri: str):
    client = Client(settings.SOLANA_RPC)
    treasury_keypair = Keypair.from_base58_string(settings.SOLANA_TREASURY_PRIVATE_KEY)
    user_pubkey = Pubkey.from_string(wallet_address)

    # Simple transfer as placeholder for real mint
    transfer_ix = transfer(
        TransferParams(
            from_pubkey=treasury_keypair.pubkey(),
            to_pubkey=user_pubkey,
            lamports=1000000  # 0.001 SOL
        )
    )

    tx = Transaction()
    tx.add(transfer_ix)
    tx.sign([treasury_keypair])

    result = client.send_transaction(tx, [treasury_keypair])

    return {
        "tx_hash": str(result["result"]),
        "gas_used": 0,
        "status": "success"
    }

def mint_certificate(chain: str, wallet_address: str, token_uri: str):
    if chain in ["polygon", "ethereum"]:
        return mint_evm_certificate(chain, wallet_address, token_uri)
    elif chain == "solana":
        return mint_solana_certificate(wallet_address, token_uri)
    else:
        raise ValueError("Unsupported chain")