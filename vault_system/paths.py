from __future__ import annotations

import os
import re
from pathlib import Path


VAULT_ROOT = Path(
    os.environ.get("SHILOH_VAULT_SYSTEM_ROOT")
    or os.environ.get("ORB_WEAVER_VAULT_ROOT")
    or Path(__file__).resolve().parent
).resolve()


def subvault(name: str) -> Path:
    safe_name = re.sub(r"[^a-z0-9_-]+", "_", (name or "unknown").strip().lower()).strip("_")
    path = VAULT_ROOT / (safe_name or "unknown")
    path.mkdir(parents=True, exist_ok=True)
    return path


APRIORI_ROOT = subvault("apriori")
POSTERIORI_ROOT = subvault("posteriori")
AUDIT_ROOT = subvault("audit")
BACKUPS_ROOT = subvault("backups")
FARM_ORB_ROOT = subvault("farm_orb")
SHEP_ROOT = subvault("shep")
BUTCH_ROOT = subvault("butch")
SUBSTRATE_ROOT = subvault("substrate")
