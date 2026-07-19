# Shiloh Ridge Repository Vault

This directory is the canonical umbrella for data used or collected by this repository. Each data-owning subsystem has its own sub-vault here.

## Rules

- New collected data must be written beneath the appropriate `vault/<domain>/` directory.
- Do not place credentials, API keys, plaintext passwords, or unredacted authentication tokens in the repository vault.
- Existing live stores remain at their compatibility paths until their callers are migrated and verified.
- Large or actively written external stores are registered in `manifest.json`; they are not duplicated during live writes.
- Derived data must identify its source, collection time, and whether it is authoritative, mirrored, or generated.

## Sub-vaults

- `butch/` — Butch memory, customer context, configuration, and statistics.
- `shep/` — approved Shep knowledge and future governed learning artifacts.
- `worker_chat/` — worker-chat persistent knowledge graph and learning queue.
- `renova/` — registry for Renova apriori/posteriori knowledge stores.
- `validators/` — deductive, inductive, and intuitive validator observations.
- `orb_weaver/` — registry for Orb Weaver crawl, audit, pointer, and website-context artifacts.

See `manifest.json` for every discovered legacy/compatibility vault and its canonical destination.
