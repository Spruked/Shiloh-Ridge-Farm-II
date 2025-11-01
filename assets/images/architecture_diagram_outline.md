# System Architecture Diagram Outline

This diagram will show:
- Frontend (React/Tailwind)
- Backend (FastAPI)
- MongoDB (local/Atlas)
- CertSig Blockchain Integration (planned)
- Notification Service (Email/SMS)
- Reporting/Export Utilities

Diagram will be created in PNG format and saved as `assets/images/architecture.png`.

---

**CertSig Minting Integration: Current State**

- `/nft/mint` API route creates an NFT record in MongoDB and updates livestock status.
- `NFTRecord` model includes fields for blockchain metadata (token_id, contract_address, transaction_hash, metadata_uri), but these are not yet populated.
- No CertSig API calls or blockchain minting logic implemented yet.
- Inventory model has a `blockchain_id` field for future CertSig/NFT token IDs.
- Next step: Implement CertSig API integration to mint NFT, update record with returned metadata, and link to invoice.

---

**Next Actions:**
- Generate PNG diagram showing current and planned data flow.
- Draft CertSig integration code for actual minting.
