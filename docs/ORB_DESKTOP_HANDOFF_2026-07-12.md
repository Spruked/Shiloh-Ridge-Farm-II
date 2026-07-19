# ORB Desktop Handoff — Shiloh Ridge — 2026-07-12

## ORBs worked on

### Shep, the Shiloh Ridge site ORB

- Visual skin: `assets/images/best_shep.png`, glass shell, tan/white outward glow rings, higher opacity, smooth full-page roaming, cursor-aware destinations, overlap nudging, manual drag, and green target ping/bloom.
- Voice input: browser MediaRecorder → FastAPI upload → CUDA faster-whisper. Critical fix: recording now auto-stops after eight seconds or on a second ORB click; previously audio was never submitted.
- Voice output: Qwen `/speak` is preferred. If it is busy or unavailable, the frontend uses an English male browser voice so Shep does not complete a navigation silently. Latency phases provide purposeful motion and visible grounded/source/answer/voice status while server audio generates.
- Cognition: qwen2.5:3b is the selected installed model with 30-minute Ollama keep-alive. Dynamic modes are `DIRECT`, `RETRIEVAL`, `TOOL`, `OCR`, and `ESCALATE`.
- Governance: canonical doctrine hash verification and Renova preflight are active in normal chat. Eight Renova modules and SF-ORB governance report healthy.
- Retrieval: `/mnt/r` is the read-only source substrate. Stable evidence pointers support path, record/animal identity, PDF page, chunk, line range, scan, integrity hash, confidence, and admin open action.
- OCR: embedded PDF text is preferred; Tesseract/PyMuPDF fallback is cached and points back to original page/source.
- Human review: real escalation records persist under `vault_system/substrate/derived/` and append governed task/result envelopes to `/mnt/r/orb_mesh/results/web` when that external mesh is mounted.
- Guidance: public crawl pointers and authenticated admin route/selector guidance are separate. Green ping lights identify targets without clicking or submitting.

### Butch the Butcher

- Products keeps only the orange-block Butch experience; the duplicate lower-corner floating Butch is disabled.
- Butch retains his separate configured server voice and voice policy.
- Existing Butch SKG remains intact and Shep→Butch handoff remains available.
- Next work: ground Butch in approved butcher substrate/crawl sources and add governed Butch→Shep return handoff carrying conversation, customer, product, evidence, and unresolved-question context.

## Shared substrate and mesh contract

- Canonical source root: `/mnt/r`.
- Governed shared mesh: `/mnt/r/orb_mesh` using append-only artifacts and checkpoints.
- Original source documents are read-only. Derived indexes, OCR, manifests, escalations, approved corrections, and promoted knowledge may be written through governed workflows.
- Website, desktop, and other ORBs should publish selected high-value learning as mesh envelopes; do not silently mutate permanent farm records.
- Public tools: health summary, grounded search through Shep, escalation creation.
- Admin tools: inventory, raw source listing/read, OCR/forced OCR, pointer creation, scan details, escalation review/resolution, and any farm-record write preparation.

## Dataset and scan state

- Orb Weaver crawl 25 is retained at `vault_system/farm_orb/crawls/crawl_25.csv`; the current map reports 434 pointers across 22 routes with no duplicate IDs.
- Orb Weaver Shiloh Ridge package inspected on R:, including current crawl/preflight, website context, claims, reports, recommendations, history, CRM/mail context, and SQLite index.
- First bounded R-drive scan is partial: 2,001 discovered; 1,817 indexed; 183 unsupported/skipped; 27 duplicates; zero permission/read/text-extraction failures; zero OCR operations required in that pass.
- KHSI registry PDF advertised at `/mnt/data/content.pdf` was unavailable. Registry answers must not be represented as verified until authoritative documents are ingested.

## MCP and API integration

- Stdio MCP entry: `backend/shep_substrate_mcp.py`.
- Tool registry: `backend/shep_tool_registry.py`.
- Service/API: `backend/substrate_service.py`, `backend/substrate_routes.py`.
- Tools: `substrate.health`, `list_sources`, `inventory`, `scan_status`, `search`, `read`, `get_pointer`, `ocr`; `escalation.create`, `list`, `read`, `resolve`.
- API-manifest policy observed: read tools may be default-enabled at the proper ORB tier; writes are prepare/append operations requiring user/admin approval where applicable.

## Security and persistence

- Temporary admin bypasses are disabled by default in frontend and backend.
- Admin identity is persisted as a bcrypt hash in Mongo; no credential is included here.
- Mongo named volume persists customer accounts, profiles, orders, farm records, and administrative data.
- Customer profile/order access is scoped by authenticated customer ID/email; admin aggregate access requires admin JWT.

## Desktop ORB next application

1. Register the Shep substrate MCP tools in the desktop API manifest with matching access levels.
2. Consume this artifact with a checkpoint; do not re-import it repeatedly.
3. Add desktop review UI for website escalations and promoted-knowledge approval.
4. Implement Butch→Shep return handoff and shared evidence payload contract.
5. Ingest authoritative KHSI and farm exports, rescan, then promote verified registry/butcher knowledge to the mesh.
