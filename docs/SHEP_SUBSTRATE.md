# Shep Grounded Substrate

Shep uses `/mnt/r` as an optional read-only source substrate and `/mnt/r/orb_mesh` as the governed append-only external mesh. Project-controlled indexes, OCR output, manifests, and escalations live in the repository's one canonical vault at `vault_system/substrate/derived/`.

## Tool and access policy

| Tool | Input | Access | Behavior |
|---|---|---|---|
| `substrate.health` | `{}` | Public summary | Reports reachability and scanner/OCR capabilities without absolute paths. |
| `substrate.search` | `query`, optional `limit` | Public through Shep | Returns excerpts and stable evidence pointers. |
| `substrate.list_sources` | optional `limit`, `source_type` | Admin | Lists indexed source metadata. |
| `substrate.inventory` | optional `max_files` | Admin | Creates a transparent scan manifest and search index. |
| `substrate.scan_status` | `{}` | Admin | Reports complete/partial/failed state and exact counts. |
| `substrate.read` | path, optional page/chunk | Admin | Reads exact text from a confined source path. |
| `substrate.get_pointer` | path plus location fields | Admin | Creates a stable source-location pointer. |
| `substrate.ocr` | path, optional page/language/force | Admin | Runs cached Tesseract OCR and retains the original pointer. |
| `escalation.create` | request, reason, evidence | Public through Shep | Persists human review and appends a mesh task envelope. |
| `escalation.list/read/resolve` | escalation identifiers | Admin | Reviews/resolves escalations and appends the resolution. |

The stdio MCP entry point is `backend/shep_substrate_mcp.py`. It implements `initialize`, `tools/list`, and `tools/call`. Configuration: `SHILOH_VAULT_SYSTEM_ROOT`, `R_DRIVE_ROOT`, `SHEP_SUBSTRATE_ROOT`, `SHEP_ORB_MESH_ROOT`, `SHEP_DERIVED_ROOT`, `SHEP_SUBSTRATE_READ_ONLY`, and `SHEP_MCP_TRANSPORT`.

Grounded responses can return `answer`, `cognitive_mode`, `governance_status`, `tool_calls`, `tool_results`, `evidence`, `confidence`, `substrate_status`, `scan_status`, `warnings`, `missing_data_notices`, `escalation`, audio fields, and `request_id`.

## Data needed from Bryan

Priority `now`:

- KHSI application, current fees/work order, registration/upgrading rules, standards, inspection/coat rules, transfer procedures, and contacts. Searchable PDF preferred; place in `vault_system/substrate/intake/registry/`.
- Animal master CSV: permanent ID, tag/tattoo, name, sex, DOB, birth/breeding type, genotype, registration number/status, flock ID, status, owner, location. Place in `animals/`.
- Pedigree CSV: animal ID, sire/dam IDs and registration numbers, breeder, owner at mating/lambing, generation/Katahdin percentage. Place in `pedigrees/`.

Priority `next`:

- Breeding/lambing/weight CSV exports with IDs, exposure, pregnancy, litter, weights, growth, and disposition.
- Health exports with treatment, vaccination, medication/dose, withdrawal, diagnosis, veterinary notes, hoof, parasite/FAMACHA, and mortality data.
- Inspection/registration CSV plus certificates with date, inspector, coat class, defects, status, corrections/rejections, and follow-up.

Priority `later`:

- Restricted ownership, sales, transfer, and customer exports: buyer/seller, dates, transfer state, authorized price, forms/certificates, contact, and pickup/delivery data.

Never add invented farm facts to intake. Test fixtures belong only in `tests/`.

## ORB guidance policy

Orb Weaver crawl 25 supplies public visitor guidance from `vault_system/farm_orb/crawls/crawl_25.csv` and the canonical pointer map. Its 22 mapped routes and 434 pointers contain no duplicate IDs. Because a public crawl cannot prove protected admin coverage, owner guidance is maintained separately from authenticated React routes and stable admin selectors. Admin tools activate only with a valid admin token; visitors cannot be routed into owner pages.

Navigation and retrieval are LLM tool calls. The local Qwen model may call `orb_site_navigate` or `substrate_search`; the backend validates and executes the tool, records the call beneath the canonical vault, and returns the tool result to the model for a natural confirmation. Pointer use is governed by route policy, and unresolved or unsafe requests can be sent to human escalation. Shep points and scrolls but does not click or submit by default.
