# Shiloh Ridge Katahdins

The public website and private farm-operations application for Shiloh Ridge Farm. The repository contains the React storefront, FastAPI admin API, Shep voice assistant, Butch product assistant, Orb Weaver pointer guidance, and the canonical auditable vault system.

## Repository layout

| Path | Purpose |
|---|---|
| `frontend/` | React public site and protected admin interface |
| `backend/` | FastAPI APIs, authentication, accounting, Shep tools, and persistence |
| `vault_system/` | The repository's only vault and root for every durable data write |
| `Renova_te_ipsum/` | Renova governance, pointer escalation, and tool packages |
| `shep_worker/`, `butch_worker/` | Worker code used by the backend |
| `shiloh_voice_system/` | Optional standalone voice services |
| `docker-compose.yml` | Local production-style orchestration |

See [Vault System](docs/VAULT_SYSTEM.md), [Admin Operations](docs/ADMIN_OPERATIONS.md), and [Shep Grounded Substrate](docs/SHEP_SUBSTRATE.md) for operational details.

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

Shep uses the locally installed `qwen2.5:3b` model by default. Navigation is an LLM tool call rather than phrase scripting: the model selects `orb_site_navigate`, the runtime resolves a permitted route and its Orb Weaver pointer, and Shep produces a natural spoken confirmation. Grounded retrieval uses `substrate_search`; uncertain or protected work can create a human escalation.

The floating assistant supports voice navigation, move/come/whistle commands, cursor-safe positioning, pointer guidance, and a visible ping. Admin routes and tools still require a valid admin session.

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
