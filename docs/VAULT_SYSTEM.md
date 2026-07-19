# Canonical Vault System

## Policy

This repository has exactly one vault: `vault_system/` at the repository root. Sub-vaults separate data by purpose without creating independent vault systems. All persistent filesystem writes must resolve under `SHILOH_VAULT_SYSTEM_ROOT`; code must not recreate historical `vault`, `vaults`, or nested `vault_system` directories.

## Sub-vaults

| Sub-vault | Data |
|---|---|
| `apriori/`, `posteriori/` | Renova canonical knowledge and learned records |
| `farm_orb/` | Crawl evidence, pointer map, and Orb Weaver source snapshots |
| `substrate/` | Intake, indexes, OCR, source pointers, and human escalations |
| `shep/` | Governed state, tool-call audit, worker learning, and traces |
| `butch/` | Customer memory, order support, promotions, and voice cache |
| `documents/`, `nft/` | Durable generated farm documents and certificates |
| `validators/`, `worker_chat/` | Validator observations and worker conversations |
| `audit/` | Append-only events and hashed inventories |
| `backups/` | Timestamped MongoDB and filesystem snapshots |

Legacy vaults were consolidated into these locations. `vault_system/farm_orb/crawls/crawl_25.csv` is retained as crawl evidence; it is moved, not deleted.

## Privacy and Git

The vault exists in the working repository, but most of its contents must never be published. `.gitignore` excludes customer/admin records, accounting-related exports, backups, raw crawl snapshots, the large pointer map, indexes, OCR output, tool traces, learned data, and database files. Git may contain vault code, policy, safe manifests, and explicitly approved small crawl evidence. Do not use `git add -f` on ignored vault data.

## Audit and recovery

`vault_system.audit` appends JSON Lines events and can generate a SHA-256 inventory without changing source records. Compose services `mongo-backup` and `file-backup` create daily timestamped snapshots under `vault_system/backups/`. Backups are local/private and excluded from Git and Docker images.

After a migration or material data change, regenerate the inventory from the repository root:

```bash
python3 -m vault_system.audit --refresh
```

Restore tests should be performed against a temporary database or directory. Do not overwrite live data merely to test a backup.
