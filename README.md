# Shiloh Ridge Katahdins

The public website and private farm-operations application for Shiloh Ridge Farm. The repository contains the React storefront, FastAPI admin API, Shep voice assistant, Butch product assistant, Orb Weaver pointer guidance, and the canonical auditable vault system.

## Repository layout

| Path | Purpose |
|---|---|
| `frontend/` | React public site and protected admin interface |
| `backend/` | FastAPI APIs, authentication, accounting, Shep tools, and persistence |
| `vault_system/` | The repository's only vault and root for every durable data write |
| `Renova_te_ipsum/` | Renova governance, pointer escalation, and tool packages |
| `butch_worker/` | Butch worker code used by the backend |
| `shiloh_voice_system/` | Optional standalone voice services |
| `docker-compose.yml` | Local production-style orchestration |

See [Vault System](docs/VAULT_SYSTEM.md), [Admin Operations](docs/ADMIN_OPERATIONS.md), [Shep Grounded Substrate](docs/SHEP_SUBSTRATE.md), [Voice Runtime Notes](VOICE_RUNTIME_NOTES.md), and the [2026-09-12 Development Log](docs/DEVLOG_2026-09-12.md) for operational details.

## One-repository, one-vault rule

`vault_system/` at the repository root is the only permitted vault. Every collected, generated, learned, administrative, customer, accounting, crawl, pointer, audit, and backup record must be stored in an appropriate sub-vault beneath it. Code must resolve the root through `SHILOH_VAULT_SYSTEM_ROOT` or `vault_system.paths`; it must not create another `vault`, `vaults`, or `vault_system` directory.

Private and generated vault records are intentionally ignored by Git. The approved small crawl CSV and non-secret manifests may be committed, while customer/admin data, Mongo/file backups, raw Orb Weaver snapshots, indexes, tool traces, and the large pointer map remain local. Never force-add ignored vault data.

## Run the stack

```bash
docker compose up --build -d
```

Default services:

- Frontend: `http://localhost:3100`
- Backend API: `http://localhost:12000`
- MongoDB: `localhost:27017`
- Ollama: host service at `http://127.0.0.1:11434`

Optional voice and checkout services are controlled by Compose profiles. The backend stores persistent admin records in MongoDB and durable file records in the root vault. Daily Mongo and file backup services write append-only timestamped snapshots beneath `vault_system/backups/`.

## Shep voice and tools

Shep uses the locally installed `qwen2.5:3b` model by default. On a new visit, he opens with one optional, open-ended question and follows the visitor's stated purpose; he never runs a forced tour or presents a menu unless the visitor needs one. Recent turns are supplied to the site-chat request so the next question, explanation, pointer, or navigation action follows the conversation.

Navigation is an LLM tool call rather than phrase scripting: once a destination is clear, the model selects `orb_site_navigate`, the runtime resolves the permitted route and a semantic target from `vault_system/site_data/website_orb_context/pointer_plot_map.json`, and Shep produces a natural confirmation. Grounded retrieval uses `substrate_search`; uncertain or protected work can create a human escalation.

Voice output is fixed policy, not a visitor preference: Kokoro TTS is attempted first, followed by Qwen3 TTS, then voice-unavailable text. Browser speech synthesis is prohibited, including as a fallback, and there is no visitor-facing output toggle. The floating assistant supports voice navigation, move/come/whistle commands, cursor-safe positioning, pointer guidance, and a visible ping. Admin routes and tools still require a valid admin session.

## Livestock images

Live livestock records may contain historical photo filenames. The public livestock page maps those known legacy references to the available farm photos in `frontend/public/` and uses the flock photo if a future image URL cannot be loaded. This preserves card rendering while records are migrated to durable image locations.

## Development

Frontend:

```bash
cd frontend
npm install
npm start
```

Backend:

```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 12000
```

Production frontend build:

```bash
cd frontend
npm run build
```

## Verification

Before publishing changes, run:

```bash
docker compose config --quiet
python3 -m compileall -q backend Renova_te_ipsum vault_system
cd frontend && npm run build
```

Do not place passwords, tokens, `.env` files, customer exports, accounting exports, or vault backups in Git. Password changes are performed from the protected Admin Settings page or authenticated API; credentials are never documented in this repository.
