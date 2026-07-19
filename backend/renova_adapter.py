import importlib
import logging
import sys
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger(__name__)

_RENOVA_CANDIDATES = [
    Path("/app/Renova_te_ipsum"),
    Path(__file__).resolve().parent.parent / "Renova_te_ipsum",
    Path.cwd() / "Renova_te_ipsum",
]
_RENOVA_ROOT = next((candidate for candidate in _RENOVA_CANDIDATES if candidate.exists()), None)
_REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
if str(_REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPOSITORY_ROOT))
if _RENOVA_ROOT is not None and str(_RENOVA_ROOT) not in sys.path:
    sys.path.insert(0, str(_RENOVA_ROOT))
if _RENOVA_ROOT is not None:
    logic_seeds_root = _RENOVA_ROOT / "logic_seeds"
    if logic_seeds_root.exists() and str(logic_seeds_root) not in sys.path:
        sys.path.insert(0, str(logic_seeds_root))


def _safe_import(module_name: str):
    try:
        return importlib.import_module(module_name), None
    except Exception as exc:
        return None, str(exc)


_orb_controller, _orb_controller_error = _safe_import("orb_controller")
_tribunal_mod, _tribunal_error = _safe_import("core_4_minds.tribunal")
_validation_mod, _validation_error = _safe_import("logic_seeds.validation_pipeline")
_bayesian_mod, _bayesian_error = _safe_import("bayesian_engine")
_vault_mod, _vault_error = _safe_import("vault_system.manager")
_hlsf_mod, _hlsf_error = _safe_import("hlsf_geometry.engine")
_sf_orb_governance_mod, _sf_orb_governance_error = _safe_import("sf_orb_Governance")


def _tribunal_lens_artifact_status() -> Dict[str, Any]:
    base = (_RENOVA_ROOT / "core_4_minds") if _RENOVA_ROOT else None
    required = {
        "kant": base / "ikant" / "kant_critical_skg.json" if base else None,
        "locke": base / "hlocke" / "locke_empiricism_skg.json" if base else None,
        "hume": base / "hhume" / "hume_skepticism_skg.json" if base else None,
        "spinoza": base / "bspinoza" / "spinoza_monism_skg.json" if base else None,
    }
    paths = {k: str(v) if v else None for k, v in required.items()}
    exists = {k: bool(v and v.exists()) for k, v in required.items()}
    all_present = all(exists.values())

    loaded = {k: False for k in required}
    missing_payload = []
    if _tribunal_mod is not None and hasattr(_tribunal_mod, "FourMindTribunal"):
        try:
            tribunal = _tribunal_mod.FourMindTribunal()
            minds = getattr(tribunal, "minds", {}) or {}
            for lens in loaded:
                payload = minds.get(lens) or {}
                loaded[lens] = payload.get("status") != "missing"
                if not loaded[lens]:
                    missing_payload.append(lens)
        except Exception:
            pass

    all_loaded = all(loaded.values())
    return {
        "required_paths": paths,
        "required_files_present": exists,
        "all_required_files_present": all_present,
        "loaded_in_tribunal": loaded,
        "all_loaded_in_tribunal": all_loaded,
        "missing_lens_payloads": missing_payload,
    }


def get_renova_status() -> Dict[str, Any]:
    lens_status = _tribunal_lens_artifact_status()
    return {
        "renova_root_found": _RENOVA_ROOT is not None,
        "renova_root_path": str(_RENOVA_ROOT) if _RENOVA_ROOT else None,
        "orb_controller_available": _orb_controller is not None,
        "four_mind_tribunal_available": _tribunal_mod is not None and hasattr(_tribunal_mod, "FourMindTribunal"),
        "validation_pipeline_available": _validation_mod is not None,
        "bayesian_engine_available": _bayesian_mod is not None,
        "vault_manager_available": _vault_mod is not None,
        "hlsf_geometry_engine_available": _hlsf_mod is not None,
        "sf_orb_governance_wrapper_available": (
            _sf_orb_governance_mod is not None
            and hasattr(_sf_orb_governance_mod, "SFOrbGovernanceWrapper")
            and hasattr(_sf_orb_governance_mod, "SFOrbOperation")
        ),
        "tribunal_lens_artifacts": lens_status,
        "errors": {
            "orb_controller": _orb_controller_error,
            "four_mind_tribunal": _tribunal_error,
            "validation_pipeline": _validation_error,
            "bayesian_engine": _bayesian_error,
            "vault_manager": _vault_error,
            "hlsf_geometry_engine": _hlsf_error,
            "sf_orb_governance": _sf_orb_governance_error,
        },
    }


def run_sf_orb_control(message: str, context: Dict[str, Any]) -> Dict[str, Any]:
    status = get_renova_status()
    if not status.get("sf_orb_governance_wrapper_available"):
        return {"status": "unavailable", "reason": "SFOrbGovernanceWrapper unavailable"}
    try:
        wrapper_cls = getattr(_sf_orb_governance_mod, "SFOrbGovernanceWrapper")
        operation_enum = getattr(_sf_orb_governance_mod, "SFOrbOperation")
        wrapper = wrapper_cls(
            renova_path=str(_RENOVA_ROOT) if _RENOVA_ROOT else "/mnt/Renova_te_ipsum",
            enable_observer=True,
            enable_infra_audit=True,
        )
        envelope = wrapper.process(
            operation=operation_enum.STIMULUS_PROCESS,
            raw_input={"message": message, "context": context},
            stimulus_type=str((context or {}).get("page_context") or "site_chat"),
        )
        return {
            "status": "ok",
            "envelope_id": getattr(envelope, "envelope_id", None),
            "trust_state": getattr(getattr(envelope, "trust_state", None), "value", None),
            "ddr_score": getattr(envelope, "ddr_score", None),
            "alert_level": getattr(getattr(envelope, "alert_level", None), "name", None),
            "infra_audit_passed": getattr(envelope, "infra_audit_passed", None),
            "doctrine_hash": getattr(envelope, "doctrine_hash", None),
            "sf_orb_response": getattr(envelope, "sf_orb_response", None),
        }
    except Exception as exc:
        return {"status": "error", "error": str(exc)}


def run_renova_preflight(message: str, context: Dict[str, Any]) -> Dict[str, Any]:
    report: Dict[str, Any] = {
        "message_excerpt": (message or "")[:240],
        "context_keys": sorted(list((context or {}).keys())),
        "status": get_renova_status(),
        "steps": [],
    }
    lens_status = (report["status"] or {}).get("tribunal_lens_artifacts") or {}
    if not lens_status.get("all_required_files_present") or not lens_status.get("all_loaded_in_tribunal"):
        report["steps"].append(
            {
                "module": "core_4_minds.tribunal_lens_artifacts",
                "status": "incomplete",
                "details": lens_status,
            }
        )

    tribunal = None
    if _tribunal_mod is not None and hasattr(_tribunal_mod, "FourMindTribunal"):
        try:
            tribunal = _tribunal_mod.FourMindTribunal()
            stimulus = {"message": message, **(context or {})}
            if hasattr(tribunal, "generate_epistemic_shadow"):
                shadows = tribunal.generate_epistemic_shadow(stimulus)
                report["steps"].append(
                    {"module": "core_4_minds.tribunal", "status": "ok", "result_keys": list(shadows.keys()) if isinstance(shadows, dict) else []}
                )
                report["tribunal_shadows"] = shadows
            else:
                report["steps"].append(
                    {"module": "core_4_minds.tribunal", "status": "available_api_unknown"}
                )
        except Exception as exc:
            report["steps"].append({"module": "core_4_minds.tribunal", "status": "error", "error": str(exc)})
    else:
        report["steps"].append({"module": "core_4_minds.tribunal", "status": "unavailable"})

    if _validation_mod is not None:
        try:
            report["steps"].append({"module": "logic_seeds.validation_pipeline", "status": "available_api_unknown"})
        except Exception as exc:
            report["steps"].append({"module": "logic_seeds.validation_pipeline", "status": "error", "error": str(exc)})
    else:
        report["steps"].append({"module": "logic_seeds.validation_pipeline", "status": "unavailable"})

    if _bayesian_mod is not None:
        try:
            report["steps"].append({"module": "bayesian_engine", "status": "available_api_unknown"})
        except Exception as exc:
            report["steps"].append({"module": "bayesian_engine", "status": "error", "error": str(exc)})
    else:
        report["steps"].append({"module": "bayesian_engine", "status": "unavailable"})

    if _vault_mod is not None:
        try:
            report["steps"].append({"module": "vault_system.manager", "status": "available_api_unknown"})
        except Exception as exc:
            report["steps"].append({"module": "vault_system.manager", "status": "error", "error": str(exc)})
    else:
        report["steps"].append({"module": "vault_system.manager", "status": "unavailable"})

    sf_orb_control = run_sf_orb_control(message, context or {})
    report["steps"].append({"module": "sf_orb_Governance.SFOrbGovernanceWrapper", "status": sf_orb_control.get("status")})
    report["sf_orb_control"] = sf_orb_control

    return report
