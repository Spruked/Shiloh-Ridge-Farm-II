# Checkout_Module_v1

A modular, production-grade checkout plugin for multi-app, multi-chain payments with universal product codes (PPID), central product registry, and blockchain verification.

## Features

### Core Functionality
- **Universal Product Codes (PPID)**: Standardized product identification across apps
- **Central Product Registry**: Single source of truth for products with validation
- **Multi-Chain Payments**: Support for fiat (Stripe) and crypto (Polygon zkEVM, Ethereum, Solana)
- **Serial Expansion**: Minting with unique serial numbers
- **Discount/Coupon System**: Flexible promotions with app-specific targeting
- **Admin Dashboard**: Web UI for product, coupon, and order management

### Compliance & Security
- **US Tax Compliance**: Location-based tax categories with precise validation
- **Blockchain Verification**: Raw JSON-RPC transaction confirmation
- **Audit Trail**: Complete order logging with block proofs
- **Anti-Spoofing**: Strict product ownership and price variance checks

### Technical Stack
- **Backend**: FastAPI (Python)
- **Database**: SQLite (demo) / PostgreSQL (production)
- **ORM**: SQLAlchemy with Pydantic models
- **Payments**: Stripe (fiat), Web3/Alchemy (crypto)
- **Frontend**: HTML/JS admin dashboard
- **Blockchain**: Polygon zkEVM with raw RPC verification

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js (for Alchemy demo)
- Stripe account and API keys
- Alchemy API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Checkout_Module_v1
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

### Docker Deployment

1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

2. Or build manually:
```bash
docker build -t checkout-module .
docker run -p 8000:8000 -e DATABASE_URL=sqlite:///./checkout.db checkout-module
```

3. Access the application at `http://localhost:8000`

### Testing Alchemy Integration

```bash
cd alchemy-demo
npm install
node demo-script.js
```

## API Documentation

### Product Management

#### Register Product
```http
POST /register-product
Content-Type: application/json

{
  "id": "prod-1",
  "ppid": "PP-AC-CER-BAS-001",
  "app_type": "alpha_certsig",
  "product_name": "Basic Certificate",
  "category": "CER",
  "tier": "BAS",
  "base_price_usd": 10.0,
  "tax_category": "standard"
}
```

#### Checkout
```http
POST /checkout
Content-Type: application/json

{
  "product_id": "PP-AC-CER-BAS-001",
  "final_price_usd": 10.8,
  "customer_email": "user@example.com",
  "payment_method": "crypto",
  "wallet_address": "0x...",
  "chain_tier": "polygon",
  "coupon_code": "SAVE10"
}
```

### Admin Endpoints

- `GET /admin/products` - List all products
- `GET /admin/coupons` - List all coupons
- `GET /admin/orders` - List all orders

## Architecture

### PPID Structure
```
PP-{APP_CODE}-{CATEGORY}-{TIER}-{VERSION}
```

Examples:
- `PP-AC-CER-BAS-001` - Alpha CertSig Basic Certificate
- `PP-TM-MNT-PRO-002` - TrueMark Pro Mint

### Tax Categories
- `standard`: 8% sales tax (configurable)
- `exempt`: 0% tax

### Order Flow
1. Product validation and ownership check
2. Coupon application (if provided)
3. Tax calculation
4. Price variance validation (±$0.01)
5. Payment processing
6. Minting (for crypto payments)
7. Transaction verification
8. Order logging with block proof

## Configuration

### Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ALCHEMY_API_KEY=ycGf05E6sGgzu-AJlA6gd
DATABASE_URL=sqlite:///checkout.db
```

### App Code Mapping
```python
APP_CODE_MAP = {
    "AC": "alpha_certsig",
    "TM": "truemark_mint",
    "GO": "goat",
    "VF": "vault_forge",
    "AD": "apex_doc",
}
```

## Security Features

- **Product Validation**: PPID structure and ownership verification
- **Price Integrity**: Bidirectional variance checking
- **Blockchain Proof**: Raw RPC transaction confirmation
- **Audit Logging**: Complete order history with timestamps

## Production Deployment

### Database Migration
For production, switch to PostgreSQL:
```env
DATABASE_URL=postgresql://user:pass@localhost/checkout
```

### Scaling Considerations
- Use Redis for session management
- Implement rate limiting
- Add comprehensive logging
- Set up monitoring and alerts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation in `bryan_doc.txt`
- Review the admin dashboard for troubleshooting