# Shiloh Ridge Katahdins

The public website and private farm-operations application for Shiloh Ridge Farm. The repository contains the React storefront, the FastAPI admin API (livestock, lineage, inventory, sales, accounting, orders, NFT certificates), and the canonical auditable vault system.

## Repository layout

| Path | Purpose |
|---|---|
| `frontend/` | React public site and protected admin interface |
| `backend/` | FastAPI APIs, authentication, accounting, inventory, sales, lineage capture, and persistence |
| `vault_system/` | The repository's only vault and root for every durable data write |
| `butch_worker/` | Meat-library data and logic used by the product-page cut calculator |
| `docker-compose.yml` | Local production-style orchestration |

See [Vault System](docs/VAULT_SYSTEM.md), [Admin Operations](docs/ADMIN_OPERATIONS.md), and the [2026-09-12 Development Log](docs/DEVLOG_2026-09-12.md) for operational details.

## One-repository, one-vault rule

`vault_system/` at the repository root is the only permitted vault. Every collected, generated, learned, administrative, customer, accounting, crawl, pointer, audit, and backup record must be stored in an appropriate sub-vault beneath it. Code must resolve the root through `SHILOH_VAULT_SYSTEM_ROOT` or `vault_system.paths`; it must not create another `vault`, `vaults`, or `vault_system` directory.

Private and generated vault records are intentionally ignored by Git. Non-secret manifests may be committed, while customer/admin data, Mongo/file backups, crawl snapshots, and indexes remain local. Never force-add ignored vault data.

## Run the stack

```bash
docker compose up --build -d
```

To verify the containers and rebuild a stale frontend container:

```bash
docker compose ps
curl -fsS http://127.0.0.1:12000/api/health
curl -I http://127.0.0.1:3100
docker compose up -d --force-recreate frontend
```

Default services:

- Frontend: `http://localhost:3100`
- Backend API: `http://localhost:12000`
- MongoDB: `localhost:27017`

The frontend is published by Docker on `0.0.0.0:3100` and serves the compiled
React build from the container's port `3000`. Use `http://127.0.0.1:3100` on
the Docker host. If the browser is on another machine, use the Docker host's
network address or forward port `3100` through the SSH, WSL, or IDE remote
development environment; `localhost` refers to the browser's own machine.

If port `3100` is not reachable, check `docker compose ps`, confirm the
frontend is `healthy`, and inspect `docker compose logs --tail=100 frontend`.

The optional checkout service is controlled by a Compose profile. The backend stores persistent admin records in MongoDB and durable file records in the root vault. Daily Mongo and file backup services write append-only timestamped snapshots beneath `vault_system/backups/`.

`api.shilohridgekatahdins.com` is published through Cloudflare to the FastAPI API at host port `12000`.

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
python3 -m compileall -q backend vault_system
cd frontend && npm run build
```

Do not place passwords, tokens, `.env` files, customer exports, accounting exports, or vault backups in Git. Password changes are performed from the protected Admin Settings page or authenticated API; credentials are never documented in this repository.
