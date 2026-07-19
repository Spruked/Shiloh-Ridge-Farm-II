from __future__ import annotations

import copy
import hashlib
import json
import os
import sys
import time
import uuid
from collections import deque
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum, auto
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Ensure parent dir is importable without packaging.
PARENT = Path(__file__).resolve().parent.parent
if str(PARENT) not in sys.path:
    sys.path.append(str(PARENT))

from bayesian_engine import BayesianEngine
from core_4_minds.tribunal import FourMindTribunal
from hlsf_geometry.engine import hlsf_singleton
from vault_system.manager import VaultManager


# ─────────────────────────────────────────────────────────────────────────────
# DOCTRINE v1.0 GOVERNANCE — INTEGRATED INTO SF_ORB_Controller
# Canonical SHA256: 27c7bfa71574f3b381bf4db860c44b9fd2daa3b414bf932078524b4b0d020747
# ─────────────────────────────────────────────────────────────────────────────


class TrustState(Enum):
    RAW = "raw"
    EPISTEMIC = "epistemic_processed"
    HARMONIZED = "harmonized"
    ARTICULATED = "articulated"
    SEALED = "sealed"
    EXECUTED = "executed"
    OVERRIDE = "article_viii_override"


class AlertLevel(Enum):
    HEALTHY = auto()
    CAUTION = auto()
    CRITICAL = auto()


class LensType(Enum):
    KANT = "kant"
    LOCKE = "locke"
    HUME = "hume"
    SPINOZA = "spinoza"


class CognitiveMode(Enum):
    GUARD = "guard"
    HABIT = "habit"
    INTUITION = "intuition"


@dataclass(frozen=True)
class NormalizedView:
    raw_source_hash: str
    normalized_form: str
    normalization_method: str
    derived_hash: str


@dataclass(frozen=True)
class LensVerdict:
    lens: str
    timestamp: str
    raw_input_hash: str
    categories: Tuple[str, ...] = field(default_factory=tuple)
    evidence_score: float = 0.0
    attenuation_flag: bool = False
    coherence_map: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0
    reasoning_trace: str = ""
    normalized_view: Optional[NormalizedView] = None
    violation_flags: Tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self):
        object.__setattr__(self, "categories", tuple(self.categories))
        object.__setattr__(self, "coherence_map", dict(self.coherence_map))
        object.__setattr__(self, "violation_flags", tuple(self.violation_flags))


@dataclass(frozen=True)
class TensionVector:
    source_lens_a: str
    source_lens_b: str
    tension_score: float
    disagreement_domain: str
    resolution_notes: str = ""


@dataclass(frozen=True)
class CognitiveState:
    mode: CognitiveMode
    bayesian_confidence: float
    guard_dominance: float
    habit_signal: float
    intuition_signal: float
    hlsf_density: float
    field_density: int
    active_mode: str
    bayes_habit_prob: float
    bayes_jump_prob: float
    bayes_guard_prob: float


@dataclass(frozen=True)
class GovernanceEnvelope:
    envelope_id: str
    created_at: str
    doctrine_version: str = "DOCTRINE_v1.0+B+C+D"
    doctrine_hash: str = "27c7bfa71574f3b381bf4db860c44b9fd2daa3b414bf932078524b4b0d020747"

    stimulus_type: str = ""
    raw_input: str = ""
    raw_input_hash: str = ""
    normalized_view: Optional[NormalizedView] = None

    lens_verdicts: Tuple[LensVerdict, ...] = field(default_factory=tuple)
    tension_vectors: Tuple[TensionVector, ...] = field(default_factory=tuple)
    harmonized_output: Dict[str, Any] = field(default_factory=dict)
    cali_articulation: str = ""
    cognitive_state: Optional[CognitiveState] = None

    trust_state: TrustState = TrustState.RAW
    ddr_score: float = 1.0
    ddr_note: str = (
        "DDR uses theoretical independence baseline of 0.5. "
        "Philosophical construct, not empirical. Use for trend detection only."
    )
    alert_level: AlertLevel = AlertLevel.HEALTHY

    article_viii_override_id: Optional[str] = None
    override_justification: Optional[str] = None

    orb_response: Optional[Dict[str, Any]] = None
    orb_response_hash: Optional[str] = None
    execution_timestamp: Optional[str] = None

    observer_annotations: Tuple[str, ...] = field(default_factory=tuple)
    infra_audit_passed: bool = False

    def __post_init__(self):
        object.__setattr__(self, "lens_verdicts", tuple(self.lens_verdicts))
        object.__setattr__(self, "tension_vectors", tuple(self.tension_vectors))
        object.__setattr__(self, "observer_annotations", tuple(self.observer_annotations))

    def compute_hash(self) -> str:
        payload = {
            "envelope_id": self.envelope_id,
            "raw_input_hash": self.raw_input_hash,
            "doctrine_hash": self.doctrine_hash,
            "trust_state": self.trust_state.value,
            "lens_count": len(self.lens_verdicts),
            "ddr": self.ddr_score,
        }
        canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def with_state(self, **kwargs) -> GovernanceEnvelope:
        current = asdict(self)
        current.update(kwargs)

        if "harmonized_output" in current and current["harmonized_output"] is not None:
            current["harmonized_output"] = copy.deepcopy(current["harmonized_output"])

        if "lens_verdicts" in kwargs:
            current["lens_verdicts"] = tuple(kwargs["lens_verdicts"])

        if "tension_vectors" in kwargs:
            current["tension_vectors"] = tuple(kwargs["tension_vectors"])

        if "observer_annotations" in kwargs:
            current["observer_annotations"] = tuple(kwargs["observer_annotations"])

        return GovernanceEnvelope(**current)


# ─────────────────────────────────────────────────────────────────────────────
# EPISTEMIC LENSES
# ─────────────────────────────────────────────────────────────────────────────


class KantLens:
    def __init__(self):
        self.name = "kant"
        self.normalization_method = "lowercase_ascii_categorical"

    def analyze(self, raw_input: str, input_hash: str) -> LensVerdict:
        normalized = NormalizedView(
            raw_source_hash=input_hash,
            normalized_form=raw_input.lower(),
            normalization_method=self.normalization_method,
            derived_hash=hashlib.sha256(raw_input.lower().encode()).hexdigest(),
        )

        raw_lower = normalized.normalized_form
        detected: List[str] = []

        if any(w in raw_lower for w in ["how many", "amount", "number", "count", "velocity"]):
            detected.append("quantity")

        if any(w in raw_lower for w in ["is it", "are they", "true", "false", "valid"]):
            detected.append("quality")

        if any(w in raw_lower for w in ["because", "cause", "effect", "why", "leads to"]):
            detected.extend(["causality", "relation"])

        if any(w in raw_lower for w in ["can", "possible", "might", "could", "may"]):
            detected.extend(["possibility", "modality"])

        if any(w in raw_lower for w in ["must", "should", "necessary", "required", "imperative"]):
            detected.extend(["necessity", "modality"])

        if not detected:
            detected.append("substance")

        universalizable = any(w in raw_lower for w in ["all", "every", "universal", "anyone"])
        if universalizable:
            detected.append("categorical_imperative")

        confidence = min(0.95, 0.4 + (0.1 * len(detected)))

        return LensVerdict(
            lens="kant",
            timestamp=datetime.now(timezone.utc).isoformat(),
            raw_input_hash=input_hash,
            categories=tuple(detected),
            confidence=confidence,
            reasoning_trace=f"Kant: {len(detected)} categories, universalizable={universalizable}",
            normalized_view=normalized,
        )


class LockeLens:
    def __init__(self):
        self.name = "locke"
        self.normalization_method = "lowercase_ascii_sensory"

    def analyze(self, raw_input: str, input_hash: str) -> LensVerdict:
        normalized = NormalizedView(
            raw_source_hash=input_hash,
            normalized_form=raw_input.lower(),
            normalization_method=self.normalization_method,
            derived_hash=hashlib.sha256(raw_input.lower().encode()).hexdigest(),
        )

        raw_lower = normalized.normalized_form
        sensory_markers = [
            "coordinates",
            "velocity",
            "position",
            "movement",
            "data",
            "observed",
            "measured",
            "sensory",
            "input",
        ]

        found = [m for m in sensory_markers if m in raw_lower]
        has_coords = "[" in raw_input and "]" in raw_input and any(c.isdigit() for c in raw_input)

        evidence_score = min(1.0, 0.2 + (0.15 * len(found)) + (0.3 if has_coords else 0.0))

        if evidence_score >= 0.35:
            reasoning = f"Locke: {len(found)} sensory markers, coordinates={has_coords}."
        else:
            reasoning = "Locke: Input lacks sensory grounding."

        return LensVerdict(
            lens="locke",
            timestamp=datetime.now(timezone.utc).isoformat(),
            raw_input_hash=input_hash,
            evidence_score=evidence_score,
            confidence=evidence_score,
            reasoning_trace=reasoning,
            normalized_view=normalized,
        )


class HumeLens:
    def __init__(self):
        self.name = "hume"
        self.normalization_method = "lowercase_ascii_skeptic"

    def analyze(self, raw_input: str, input_hash: str) -> LensVerdict:
        normalized = NormalizedView(
            raw_source_hash=input_hash,
            normalized_form=raw_input.lower(),
            normalization_method=self.normalization_method,
            derived_hash=hashlib.sha256(raw_input.lower().encode()).hexdigest(),
        )

        raw_lower = normalized.normalized_form

        causal = ["because", "causes", "leads to", "results in", "therefore", "predict"]
        induction = ["always", "never", "all", "every", "must be", "certainly", "habit"]
        moral = ["should", "ought", "must", "required", "duty", "imperative"]

        c_count = sum(1 for item in causal if item in raw_lower)
        i_count = sum(1 for item in induction if item in raw_lower)
        m_count = sum(1 for item in moral if item in raw_lower)

        attenuation = (c_count > 0) or (i_count > 1) or (m_count > 1)
        confidence = max(0.1, 0.9 - (0.1 * (c_count + i_count + m_count)))

        parts: List[str] = []
        if c_count:
            parts.append(f"{c_count} causal claims")
        if i_count:
            parts.append(f"{i_count} inductive leaps")
        if m_count:
            parts.append(f"{m_count} moral oughts")

        reasoning = "Hume: " + ("; ".join(parts) if parts else "No obvious overreach.")

        return LensVerdict(
            lens="hume",
            timestamp=datetime.now(timezone.utc).isoformat(),
            raw_input_hash=input_hash,
            attenuation_flag=attenuation,
            confidence=confidence,
            reasoning_trace=reasoning,
            normalized_view=normalized,
        )


class SpinozaLens:
    def __init__(self, system_state: Optional[Dict[str, Any]] = None):
        self.name = "spinoza"
        self.normalization_method = "lowercase_ascii_monism"
        self.system_state = system_state or {}

    def analyze(self, raw_input: str, input_hash: str) -> LensVerdict:
        normalized = NormalizedView(
            raw_source_hash=input_hash,
            normalized_form=raw_input.lower(),
            normalization_method=self.normalization_method,
            derived_hash=hashlib.sha256(raw_input.lower().encode()).hexdigest(),
        )

        raw_lower = normalized.normalized_form
        coherence_map: Dict[str, Any] = {}
        aligned: List[str] = []

        for key in self.system_state.keys():
            if key.lower() in raw_lower:
                aligned.append(key)
                coherence_map[key] = {
                    "alignment": "congruent",
                    "mode": "attribute" if key.startswith("attr_") else "mode",
                }

        has_necessity = any(w in raw_lower for w in ["necessary", "must", "always", "unity", "substance"])
        has_symmetry = any(w in raw_lower for w in ["symmetric", "mirror", "balanced", "equal"])

        score = min(
            1.0,
            0.3
            + (0.2 * len(aligned))
            + (0.2 if has_necessity else 0.0)
            + (0.2 if has_symmetry else 0.0),
        )

        reasoning = (
            f"Spinoza: {len(aligned)} concepts aligned. "
            f"Necessity={has_necessity}, Symmetry={has_symmetry}. Coherence={score:.2f}."
        )

        return LensVerdict(
            lens="spinoza",
            timestamp=datetime.now(timezone.utc).isoformat(),
            raw_input_hash=input_hash,
            coherence_map=coherence_map,
            confidence=score,
            reasoning_trace=reasoning,
            normalized_view=normalized,
        )


# ─────────────────────────────────────────────────────────────────────────────
# HARMONIZER / CALI / DDR / AUDITORS
# ─────────────────────────────────────────────────────────────────────────────


class Harmonizer:
    def harmonize(self, verdicts: List[LensVerdict]) -> Tuple[Dict[str, Any], List[TensionVector]]:
        if not verdicts:
            return {}, []

        tensions: List[TensionVector] = []
        confidences: List[float] = []

        for i, v1 in enumerate(verdicts):
            confidences.append(v1.confidence)
            for v2 in verdicts[i + 1:]:
                tensions.append(self._tension(v1, v2))

        hume = next((v for v in verdicts if v.lens == "hume"), None)
        attenuation = 0.3 if hume and hume.attenuation_flag else 0.0

        avg = sum(confidences) / len(confidences) if confidences else 0.5
        h_conf = max(0.1, avg - attenuation)

        synthesis = {
            "harmonized_confidence": round(h_conf, 4),
            "lens_count": len(verdicts),
            "dominant_category": self._category(verdicts),
            "attenuation_applied": attenuation > 0,
            "empirical_grounding": next((v.evidence_score for v in verdicts if v.lens == "locke"), 0.0),
            "system_coherence": next((v.confidence for v in verdicts if v.lens == "spinoza"), 0.0),
        }

        return synthesis, tensions

    def _tension(self, v1: LensVerdict, v2: LensVerdict) -> TensionVector:
        diff = abs(v1.confidence - v2.confidence)
        domain = "general"

        if v1.lens == "kant" and v2.lens == "locke":
            domain = "a_priori_vs_empirical"
        elif v1.lens == "hume" and v2.lens in ["kant", "spinoza"]:
            domain = "skepticism_vs_rationalism"
        elif v1.lens == "spinoza" and v2.lens == "hume":
            domain = "necessity_vs_contingency"

        score = round(min(1.0, diff + (0.2 if v1.lens != v2.lens else 0.0)), 4)

        return TensionVector(
            source_lens_a=v1.lens,
            source_lens_b=v2.lens,
            tension_score=score,
            disagreement_domain=domain,
            resolution_notes=f"{v1.lens}({v1.confidence:.2f}) vs {v2.lens}({v2.confidence:.2f})",
        )

    def _category(self, verdicts: List[LensVerdict]) -> str:
        kant = next((v for v in verdicts if v.lens == "kant"), None)
        return kant.categories[0] if kant and kant.categories else "unclassified"


class CALIArticulator:
    def articulate(self, envelope: GovernanceEnvelope) -> str:
        parts = [
            f"=== CALI ARTICULATION [{envelope.envelope_id}] ===",
            f"Stimulus: {envelope.stimulus_type or 'UNKNOWN'}",
            f"Trust State: {envelope.trust_state.value}",
            f"DDR: {envelope.ddr_score:.4f}",
        ]

        if envelope.cognitive_state:
            cs = envelope.cognitive_state
            parts.extend(
                [
                    "\n--- Cognitive State ---",
                    f"  Mode: {cs.mode.value}",
                    f"  Bayesian: {cs.bayesian_confidence:.2f}",
                    f"  Guard: {cs.guard_dominance:.2f} | Habit: {cs.habit_signal:.2f} | Intuition: {cs.intuition_signal:.2f}",
                    f"  HLSF Density: {cs.hlsf_density:.2f} | Field: {cs.field_density}",
                ]
            )

        parts.append("\n--- Lens Summary ---")
        for verdict in envelope.lens_verdicts:
            parts.append(f"  {verdict.lens.upper()}: conf={verdict.confidence:.2f} | {verdict.reasoning_trace[:80]}...")

        if envelope.tension_vectors:
            parts.append("\n--- Tensions ---")
            for tension in envelope.tension_vectors:
                parts.append(f"  {tension.source_lens_a}↔{tension.source_lens_b}: {tension.tension_score:.2f}")

        if envelope.alert_level == AlertLevel.CRITICAL:
            parts.append("\n⚠️ CRITICAL: Lens monoculture detected.")
        elif envelope.alert_level == AlertLevel.CAUTION:
            parts.append("\n⚠️ CAUTION: Emerging correlation.")

        if envelope.article_viii_override_id:
            parts.extend(
                [
                    f"\n🚨 OVERRIDE: {envelope.article_viii_override_id}",
                    f"   Justification: {envelope.override_justification or 'None'}",
                ]
            )

        parts.append("\n=== END CALI ===")
        return "\n".join(parts)

    def detect_anomaly(self, envelope: GovernanceEnvelope) -> List[str]:
        anomalies: List[str] = []

        confidences = [v.confidence for v in envelope.lens_verdicts]
        if len(confidences) >= 2:
            avg = sum(confidences) / len(confidences)
            variance = sum((c - avg) ** 2 for c in confidences) / len(confidences)
            if variance < 0.01:
                anomalies.append("ANOMALY: Near-zero variance suggests lens correlation.")

        missing = {"kant", "locke", "hume", "spinoza"} - {v.lens for v in envelope.lens_verdicts}
        if missing:
            anomalies.append(f"ANOMALY: Missing lenses: {sorted(missing)}")

        if envelope.trust_state == TrustState.SEALED and not envelope.orb_response_hash:
            anomalies.append("ANOMALY: Sealed envelope lacks response hash.")

        return anomalies


class DDRMonitor:
    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.history: List[float] = []
        self.baseline_note = (
            "DDR uses theoretical independence baseline of 0.5. "
            "Philosophical construct, not empirical. Use for trend detection only."
        )

    def compute_ddr(self, tensions: List[TensionVector]) -> float:
        if not tensions:
            return 1.0

        observed = sum(t.tension_score for t in tensions) / len(tensions)
        ddr = round(min(2.0, observed / 0.5), 4)

        self.history.append(ddr)
        if len(self.history) > self.window_size:
            self.history.pop(0)

        return ddr

    def get_alert_level(self, ddr: float) -> AlertLevel:
        if ddr > 0.8:
            return AlertLevel.HEALTHY
        if ddr > 0.5:
            return AlertLevel.CAUTION
        return AlertLevel.CRITICAL


class ObserverAuditor:
    def __init__(self):
        self.violations: List[Dict[str, Any]] = []

    def inspect(self, envelope: GovernanceEnvelope) -> List[str]:
        violations: List[str] = []

        if not envelope.raw_input_hash:
            violations.append("VIOLATION: Missing raw input hash")

        lens_names = [v.lens for v in envelope.lens_verdicts]
        if len(lens_names) != len(set(lens_names)):
            violations.append("VIOLATION: Duplicate lens detected")

        if envelope.trust_state == TrustState.OVERRIDE and not envelope.article_viii_override_id:
            violations.append("VIOLATION: Override without Article VIII ID")

        for violation in violations:
            self.violations.append(
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "envelope_id": envelope.envelope_id,
                    "violation": violation,
                }
            )

        return violations


class InfraAuditor:
    def __init__(self):
        self.checks: List[Dict[str, Any]] = []

    def audit(self, raw_input: str, envelope: GovernanceEnvelope) -> bool:
        checks: List[Tuple[str, bool]] = []

        checks.append(
            (
                "hash_chain",
                hashlib.sha256(raw_input.encode()).hexdigest() == envelope.raw_input_hash,
            )
        )

        checks.append(("length", len(raw_input) > 0))

        try:
            created = datetime.fromisoformat(envelope.created_at)
            checks.append(("temporal", created <= datetime.now(timezone.utc)))
        except Exception:
            created = None
            checks.append(("temporal", False))

        lens_valid = True
        if created is not None:
            for verdict in envelope.lens_verdicts:
                try:
                    if datetime.fromisoformat(verdict.timestamp) < created:
                        lens_valid = False
                except Exception:
                    lens_valid = False

        checks.append(("causal", lens_valid))

        all_pass = all(result for _, result in checks)

        self.checks.append(
            {
                "envelope_id": envelope.envelope_id,
                "checks": checks,
                "passed": all_pass,
            }
        )

        return all_pass


class GovernanceEngine:
    """Constitutional middleware for SF_ORB_Controller."""

    def __init__(self, system_state: Optional[Dict[str, Any]] = None):
        self.lenses = [
            KantLens(),
            LockeLens(),
            HumeLens(),
            SpinozaLens(system_state),
        ]
        self.harmonizer = Harmonizer()
        self.cali = CALIArticulator()
        self.ddr = DDRMonitor()
        self.observer = ObserverAuditor()
        self.infra = InfraAuditor()
        self.chain: List[GovernanceEnvelope] = []

    def process(
        self,
        stimulus: Dict[str, Any],
        logic_state: Dict[str, Any],
        override_id: Optional[str] = None,
        justification: Optional[str] = None,
    ) -> GovernanceEnvelope:
        raw_str = json.dumps(stimulus, sort_keys=True, default=str)
        raw_hash = hashlib.sha256(raw_str.encode()).hexdigest()
        envelope_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        active_mode = logic_state.get("active_mode", "GUARD")

        cognitive_state = CognitiveState(
            mode=(
                CognitiveMode.GUARD
                if active_mode == "GUARD"
                else CognitiveMode.HABIT
                if "HABIT" in active_mode
                else CognitiveMode.INTUITION
            ),
            bayesian_confidence=logic_state.get("bayes_habit_prob", 0.5),
            guard_dominance=logic_state.get("bayes_guard_prob", 0.5),
            habit_signal=logic_state.get("bayes_habit_prob", 0.0),
            intuition_signal=logic_state.get("bayes_jump_prob", 0.0),
            hlsf_density=logic_state.get("field_density", 0) / 1000.0,
            field_density=logic_state.get("field_density", 0),
            active_mode=active_mode,
            bayes_habit_prob=logic_state.get("bayes_habit_prob", 0.0),
            bayes_jump_prob=logic_state.get("bayes_jump_prob", 0.0),
            bayes_guard_prob=logic_state.get("bayes_guard_prob", 0.0),
        )

        envelope = GovernanceEnvelope(
            envelope_id=envelope_id,
            created_at=now,
            stimulus_type=stimulus.get("type", "unknown"),
            raw_input=raw_str,
            raw_input_hash=raw_hash,
            cognitive_state=cognitive_state,
        )

        verdicts: List[LensVerdict] = []
        for lens in self.lenses:
            try:
                verdicts.append(lens.analyze(raw_str, raw_hash))
            except Exception as exc:
                verdicts.append(
                    LensVerdict(
                        lens=lens.name,
                        timestamp=now,
                        raw_input_hash=raw_hash,
                        confidence=0.0,
                        reasoning_trace=f"FAIL: {exc}",
                        violation_flags=("LENS_ERROR",),
                    )
                )

        envelope = envelope.with_state(
            lens_verdicts=verdicts,
            trust_state=TrustState.EPISTEMIC,
        )

        synthesis, tensions = self.harmonizer.harmonize(verdicts)
        envelope = envelope.with_state(
            harmonized_output=synthesis,
            tension_vectors=tensions,
            trust_state=TrustState.HARMONIZED,
        )

        ddr = self.ddr.compute_ddr(tensions)
        envelope = envelope.with_state(
            ddr_score=ddr,
            alert_level=self.ddr.get_alert_level(ddr),
        )

        envelope = envelope.with_state(
            cali_articulation=self.cali.articulate(envelope),
            trust_state=TrustState.ARTICULATED,
        )

        self.observer.inspect(envelope)
        infra_pass = self.infra.audit(raw_str, envelope)

        envelope = envelope.with_state(infra_audit_passed=infra_pass)

        if override_id:
            envelope = envelope.with_state(
                trust_state=TrustState.OVERRIDE,
                article_viii_override_id=override_id,
                override_justification=justification or "None",
            )
        else:
            envelope = envelope.with_state(trust_state=TrustState.SEALED)

        self.chain.append(envelope)
        return envelope

    def finalize(self, envelope: GovernanceEnvelope, orb_response: Dict[str, Any]) -> GovernanceEnvelope:
        response_hash = hashlib.sha256(
            json.dumps(orb_response, sort_keys=True, default=str).encode()
        ).hexdigest()

        envelope = envelope.with_state(
            orb_response=orb_response,
            orb_response_hash=response_hash,
            execution_timestamp=datetime.now(timezone.utc).isoformat(),
            trust_state=TrustState.EXECUTED,
            observer_annotations=tuple(self.cali.detect_anomaly(envelope)),
        )

        self.chain = [
            existing if existing.envelope_id != envelope.envelope_id else envelope
            for existing in self.chain
        ]

        return envelope


# ─────────────────────────────────────────────────────────────────────────────
# SF-ORB CONTROLLER
# ─────────────────────────────────────────────────────────────────────────────


class CrossDomainPredicate:
    """Emergent thought-object synthesized across epistemic, spatial, and logic domains."""

    def __init__(self, epistemic, spatial, logic, synthesis_confidence):
        self.epistemic_traces = epistemic
        self.hlsf_node = spatial
        self.logic_validity = logic
        self.confidence = synthesis_confidence
        self.timestamp = time.time()

    def pulse(self):
        mode = self.logic_validity.get("active_mode") or (
            "INTUITION-JUMP"
            if self.logic_validity.get("intuitive_jump_triggered")
            else "HABIT"
            if self.logic_validity.get("custom_habit_active")
            else "GUARD"
        )

        return {
            "glow_intensity": self.confidence,
            "spatial_coordinate": self.hlsf_node,
            "epistemic_alignment": self._calculate_axiomatic_alignment(),
            "deterministic": self.confidence > 0.95,
            "predictive_intent": self.logic_validity.get("inductive_prediction", {}),
            "jump_vector": self.logic_validity.get("necessity_vector", []),
            "cognitive_mode": mode,
            "bayes_habit_prob": self.logic_validity.get("bayes_habit_prob"),
            "bayes_jump_prob": self.logic_validity.get("bayes_jump_prob"),
            "bayes_guard_prob": self.logic_validity.get("bayes_guard_prob"),
            "epistemic_bayes": self.logic_validity.get("epistemic_bayes"),
            "governance_envelope": self.logic_validity.get("governance_envelope"),
        }

    def _calculate_axiomatic_alignment(self):
        if not self.epistemic_traces:
            return 0.0

        confidences = [
            trace.get("confidence", 0.5)
            for trace in self.epistemic_traces.values()
        ]

        return sum(confidences) / len(confidences)


class HabitTracker:
    """Humean constant conjunction tracker for cursor movements."""

    def __init__(self, vault_manager):
        self.vault = vault_manager
        if not hasattr(self.vault, "posteriori_cache"):
            self.vault.posteriori_cache = {}
        self.sequence_buffer = deque(maxlen=5)
        self.pattern_cache: Dict[str, Dict[str, Any]] = {}

    def record_observation(self, stimulus):
        if stimulus.get("type") != "cursor_movement":
            return None

        coords = stimulus.get("coordinates", [0, 0])
        quadrant = self._coords_to_quadrant(coords)

        observation = {
            "quadrant": quadrant,
            "coords": coords,
            "velocity": stimulus.get("velocity", 0.0),
            "timestamp": time.time(),
        }

        self.sequence_buffer.append(observation)

        if len(self.sequence_buffer) >= 3:
            pattern_key = self._serialize_pattern(list(self.sequence_buffer))
            self._update_conjunction_frequency(pattern_key)

        return observation

    def predict_next(self):
        if len(self.sequence_buffer) < 3:
            return None

        current_pattern = self._serialize_pattern(list(self.sequence_buffer)[-3:])
        cached = getattr(self.vault, "posteriori_cache", {}).get(f"habit_{current_pattern}")

        if cached:
            return {
                "prediction_type": "QUADRANT_TRANSITION",
                "target": cached.get("predicted_next"),
                "confidence": cached.get("frequency", 0.0),
                "hume_vivacity": min(cached.get("frequency", 0.0) * 1.2, 1.0),
            }

        return {
            "prediction_type": "UNSURE",
            "confidence": 0.3,
            "hume_vivacity": 0.4,
        }

    def _coords_to_quadrant(self, coords):
        x, y = coords[0], coords[1]
        col = 0 if x < 960 else 1
        row = 0 if y < 540 else 1
        return ["NW", "NE", "SW", "SE"][row * 2 + col]

    def _serialize_pattern(self, sequence):
        return "_".join([item["quadrant"] for item in sequence])

    def _update_conjunction_frequency(self, pattern_key):
        if pattern_key not in self.pattern_cache:
            self.pattern_cache[pattern_key] = {"count": 0}

        self.pattern_cache[pattern_key]["count"] += 1

        self.vault.crystallize(
            f"habit_{pattern_key}",
            {
                "pattern": pattern_key,
                "frequency": min(self.pattern_cache[pattern_key]["count"] / 10.0, 1.0),
                "predicted_next": self._extrapolate_next_quadrant(pattern_key),
                "temporal_decay": 0.95,
            },
        )

    def _extrapolate_next_quadrant(self, pattern_key):
        parts = pattern_key.split("_")
        return parts[-1] if len(parts) >= 2 else "UNKNOWN"


class IntuitiveRecognizer:
    """Spinozan necessity recognizer for high-density fields."""

    def __init__(self, hlsf_engine):
        self.hlsf = hlsf_engine
        self.symmetry_threshold = 0.6
        self.density_threshold = 50

    def check_necessity(self, stimulus, current_node):
        field_density = len(self.hlsf.field_map)

        if field_density > self.density_threshold:
            symmetry_score = self._calculate_bilateral_symmetry()
            print(
                f"[INTUITION] density={field_density} "
                f"symmetry={symmetry_score:.3f} threshold={self.symmetry_threshold}"
            )

            if symmetry_score > self.symmetry_threshold:
                necessity_vector = self._calculate_substance_vector(current_node)

                return {
                    "jump_triggered": True,
                    "necessity_vector": necessity_vector,
                    "substance_unity_score": symmetry_score,
                    "bypass_steps": field_density // 10,
                    "spinozan_certainty": 0.98,
                    "field_density": field_density,
                }

        return {
            "jump_triggered": False,
            "field_density": field_density,
            "spinozan_certainty": 0.0,
            "substance_unity_score": self._calculate_bilateral_symmetry(),
        }

    def _calculate_bilateral_symmetry(self):
        if not self.hlsf.field_map:
            return 0.0

        nodes = list(self.hlsf.field_map.values())
        if len(nodes) < 2:
            return 0.0

        mirror_pairs = 0
        total_pairs = min(50, len(nodes) // 2)
        if total_pairs <= 0:
            return 0.0

        for idx in range(total_pairs):
            left = nodes[idx].coordinates
            right = nodes[-(idx + 1)].coordinates
            diff = sum(abs(a + b) for a, b in zip(left, right)) / max(len(left), 1)
            if diff < 0.75:
                mirror_pairs += 1

        return mirror_pairs / total_pairs

    def _calculate_substance_vector(self, current_node):
        neighbors = self.hlsf.get_recursive_neighbors(current_node, radius=3)
        return list(self.hlsf.calculate_thought_vector([current_node] + neighbors))


class SF_ORB_Controller:
    """Public Renova controller contract used by SFOrbGovernanceWrapper."""

    def __init__(self, enable_llm_articulation: Optional[bool] = None):
        self.renova_root = Path(__file__).resolve().parent
        vault_root = Path(os.environ.get("SHILOH_VAULT_SYSTEM_ROOT", self.renova_root.parent / "vault_system"))
        self.vault = VaultManager(base_path=str(vault_root))
        self.bayesian = BayesianEngine()
        self.tribunal = FourMindTribunal()
        self.hlsf = hlsf_singleton
        self.habit_tracker = HabitTracker(self.vault)
        self.intuitive = IntuitiveRecognizer(self.hlsf)
        self.governance = GovernanceEngine(system_state={"renova_root": str(self.renova_root)})
        self.validation_layer = None
        self.validation_error = None
        self.llm_articulation_enabled = (
            enable_llm_articulation
            if enable_llm_articulation is not None
            else str(os.environ.get("RENOVA_ENABLE_LOCAL_LLM", "")).lower() in {"1", "true", "yes"}
        )
        self._module_status = {
            "BayesianEngine": {"available": True, "api": ["set_prior", "add_evidence", "calculate_posterior", "get_evidence_summary"]},
            "VaultManager": {"available": True, "api": ["lightning_query", "crystallize"]},
            "validation_pipeline": {"available": False, "api": ["FinalValidationLayer.validate_for_delivery"]},
            "HLSF engine": {"available": True, "api": ["map_adjacency", "get_recursive_neighbors", "calculate_thought_vector", "pulse"]},
            "FourMindTribunal": {"available": True, "api": ["generate_epistemic_shadow"]},
        }
        self._initialize_validation_layer()
        self._initialize_bayesian_priors()

    def _initialize_validation_layer(self):
        try:
            logic_path = self.renova_root / "logic_seeds"
            if str(logic_path) not in sys.path:
                sys.path.insert(0, str(logic_path))
            from validation_pipeline import FinalValidationLayer

            old_cwd = Path.cwd()
            try:
                os.chdir(logic_path)
                self.validation_layer = FinalValidationLayer()
            finally:
                os.chdir(old_cwd)
            self._module_status["validation_pipeline"]["available"] = True
        except Exception as exc:
            self.validation_error = str(exc)
            self._module_status["validation_pipeline"]["error"] = str(exc)

    def _initialize_bayesian_priors(self):
        for hypothesis, probability in {
            "guard_mode": 0.55,
            "habit_mode": 0.30,
            "intuition_mode": 0.15,
            "semantic_retrieval": 0.50,
        }.items():
            self.bayesian.set_prior(hypothesis, probability)

    def cognitively_emerge(self, stimulus: Dict[str, Any]) -> Dict[str, Any]:
        """Run stimulus through Renova cognition and return final governed output."""
        normalized = self._normalize_stimulus(stimulus)
        raw_input_hash = self._hash(normalized)

        vault_hit = self.vault.lightning_query(normalized)
        hlsf_node = self.hlsf.map_adjacency(normalized)
        hlsf_neighbors = self.hlsf.get_recursive_neighbors(hlsf_node, radius=3)
        thought_vector = self.hlsf.calculate_thought_vector([hlsf_node] + hlsf_neighbors)
        epistemic_shadow = self.tribunal.generate_epistemic_shadow(normalized)
        habit_observation = self.habit_tracker.record_observation(normalized)
        habit_prediction = self.habit_tracker.predict_next()
        intuitive_state = self.intuitive.check_necessity(normalized, hlsf_node)

        logic_state = self._build_logic_state(
            normalized,
            vault_hit,
            epistemic_shadow,
            habit_observation,
            habit_prediction,
            intuitive_state,
        )
        cross_domain = CrossDomainPredicate(
            epistemic=epistemic_shadow,
            spatial={
                "n": hlsf_node.n,
                "k": hlsf_node.k,
                "coordinates": hlsf_node.coordinates,
                "neighbors": len(hlsf_neighbors),
            },
            logic=logic_state,
            synthesis_confidence=self._synthesis_confidence(epistemic_shadow, logic_state),
        )
        pulse = cross_domain.pulse()
        envelope = self.governance.process(normalized, logic_state)

        native_response = self._build_native_response(
            normalized,
            vault_hit,
            epistemic_shadow,
            thought_vector,
            logic_state,
            envelope,
            pulse,
        )
        articulated = self._articulate(native_response, envelope)
        core_verdict = {**native_response, "final_text": articulated, "response": articulated}

        validation_result = self._validate_for_delivery(core_verdict, normalized, logic_state, thought_vector)
        reconciliation = self._reconcile_after_articulation(normalized, articulated, validation_result)

        final_payload = self._build_final_payload(
            normalized,
            envelope,
            validation_result,
            reconciliation,
            articulated,
            raw_input_hash,
            logic_state,
            pulse,
        )

        executed_envelope = self.governance.finalize(envelope, final_payload)
        final_payload["envelope_id"] = executed_envelope.envelope_id
        final_payload["trust_state"] = executed_envelope.trust_state.value
        final_payload["response_hash"] = executed_envelope.orb_response_hash
        final_payload["observer_annotations"] = list(executed_envelope.observer_annotations)
        final_payload["governance_envelope"] = self._envelope_reference(executed_envelope)
        return final_payload

    def _synthesis_confidence(self, epistemic_shadow, logic_state) -> float:
        confidences = [trace.get("confidence", 0.5) for trace in epistemic_shadow.values()]
        epistemic = sum(confidences) / len(confidences) if confidences else 0.5
        bayes = max(
            logic_state.get("bayes_guard_prob", 0.0),
            logic_state.get("bayes_habit_prob", 0.0),
            logic_state.get("bayes_jump_prob", 0.0),
        )
        return round((epistemic + bayes) / 2.0, 4)

    def _normalize_stimulus(self, stimulus: Any) -> Dict[str, Any]:
        if isinstance(stimulus, dict):
            normalized = dict(stimulus)
        else:
            normalized = {"type": "text", "content": str(stimulus)}
        normalized.setdefault("type", "text")
        normalized.setdefault("content", "")
        normalized.setdefault("intensity", 0.5)
        normalized.setdefault("velocity", 0.0)
        return normalized

    def _build_logic_state(
        self,
        stimulus,
        vault_hit,
        epistemic_shadow,
        habit_observation,
        habit_prediction,
        intuitive_state,
    ) -> Dict[str, Any]:
        stimulus_text = json.dumps(stimulus, sort_keys=True)
        evidence_strength = min(0.95, max(0.05, len(stimulus_text) / 240.0))

        self.bayesian.add_evidence("guard_mode", f"guard_{time.time()}", 0.70, source="renova_controller")
        self.bayesian.add_evidence(
            "semantic_retrieval",
            f"vault_{time.time()}",
            0.90 if vault_hit else 0.35,
            source="vault_system",
        )
        self.bayesian.add_evidence(
            "habit_mode",
            f"habit_{time.time()}",
            habit_prediction.get("confidence", 0.25) if habit_prediction else 0.25,
            source="habit_tracker",
        )
        self.bayesian.add_evidence(
            "intuition_mode",
            f"intuition_{time.time()}",
            intuitive_state.get("spinozan_certainty", 0.10),
            source="hlsf_geometry",
        )

        guard_prob = self.bayesian.calculate_posterior("guard_mode") or 0.5
        habit_prob = self.bayesian.calculate_posterior("habit_mode") or 0.3
        jump_prob = self.bayesian.calculate_posterior("intuition_mode") or 0.15

        if intuitive_state.get("jump_triggered"):
            active_mode = "INTUITION-JUMP"
        elif habit_prediction and habit_prediction.get("confidence", 0.0) > 0.65:
            active_mode = "HABIT"
        else:
            active_mode = "GUARD"

        return {
            "active_mode": active_mode,
            "bayes_guard_prob": round(guard_prob, 4),
            "bayes_habit_prob": round(habit_prob, 4),
            "bayes_jump_prob": round(jump_prob, 4),
            "field_density": len(self.hlsf.field_map),
            "vault_hit": bool(vault_hit),
            "vault_source": vault_hit.get("source") if vault_hit else None,
            "habit_observation": habit_observation,
            "inductive_prediction": habit_prediction or {},
            "intuitive_jump_triggered": bool(intuitive_state.get("jump_triggered")),
            "necessity_vector": intuitive_state.get("necessity_vector", []),
            "epistemic_bayes": {
                mind: trace.get("confidence", 0.0)
                for mind, trace in epistemic_shadow.items()
            },
            "evidence_strength": evidence_strength,
        }

    def _build_native_response(self, stimulus, vault_hit, epistemic_shadow, thought_vector, logic_state, envelope, pulse):
        final_text = self._native_text(stimulus, vault_hit, logic_state, envelope)
        return {
            "response": final_text,
            "final_text": final_text,
            "pulse": pulse,
            "cognitive_mode": self._mode_value(logic_state["active_mode"]),
            "logic_state": logic_state,
            "bayesian_status": {
                "guard": logic_state["bayes_guard_prob"],
                "habit": logic_state["bayes_habit_prob"],
                "intuition": logic_state["bayes_jump_prob"],
                "semantic_retrieval": self.bayesian.calculate_posterior("semantic_retrieval"),
            },
            "vault_status": {
                "queried": True,
                "hit": bool(vault_hit),
                "source": vault_hit.get("source") if vault_hit else None,
            },
            "tribunal_status": {
                "available": True,
                "lenses": sorted(epistemic_shadow.keys()),
                "shadow": epistemic_shadow,
            },
            "hlsf_status": {
                "available": True,
                "field_density": len(self.hlsf.field_map),
                "thought_vector_dimensions": len(thought_vector),
                "edge_cutter_active": self.hlsf.edge_cutter_active,
            },
            "validation_status": {
                "available": self.validation_layer is not None,
                "error": self.validation_error,
            },
            "governance_envelope": self._envelope_reference(envelope),
        }

    def _native_text(self, stimulus, vault_hit, logic_state, envelope):
        content = stimulus.get("content") or stimulus.get("text") or json.dumps(stimulus, sort_keys=True)
        if vault_hit:
            return f"Renova resolved the stimulus through {vault_hit.get('source')} vault memory: {content}"
        return (
            "Renova processed the stimulus through governed native cognition "
            f"in {self._mode_value(logic_state['active_mode'])} mode: {content}"
        )

    def _articulate(self, native_response, envelope) -> str:
        if self.llm_articulation_enabled:
            llm_text = self._try_local_llm(native_response, envelope)
            if llm_text:
                return llm_text
        return native_response["final_text"]

    def _try_local_llm(self, native_response, envelope) -> Optional[str]:
        try:
            import urllib.request

            host = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
            model = os.environ.get("RENOVA_LOCAL_LLM_MODEL", os.environ.get("OLLAMA_MODEL", "qwen3"))
            prompt = (
                "Articulate this Renova cognitive result plainly without changing its governed meaning:\n"
                + json.dumps(
                    {
                        "response": native_response.get("final_text"),
                        "mode": native_response.get("cognitive_mode"),
                        "envelope_id": envelope.envelope_id,
                    },
                    sort_keys=True,
                )
            )
            body = json.dumps({"model": model, "prompt": prompt, "stream": False}).encode("utf-8")
            req = urllib.request.Request(
                f"{host}/api/generate",
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            text = (payload.get("response") or "").strip()
            return text or None
        except Exception:
            return None

    def _validate_for_delivery(self, core_verdict, stimulus, logic_state, thought_vector):
        if self.validation_layer is None:
            return {
                **core_verdict,
                "_validation_witness": {
                    "checked": False,
                    "congruent": False,
                    "reason": self.validation_error or "validation layer unavailable",
                },
            }

        logic_path = self.renova_root / "logic_seeds"
        old_cwd = Path.cwd()
        try:
            os.chdir(logic_path)
            return self.validation_layer.validate_for_delivery(
                core_verdict,
                {
                    "stimulus": stimulus,
                    "logic_state": logic_state,
                    "hlsf": {
                        "field_density": len(self.hlsf.field_map),
                        "thought_vector": list(thought_vector[:8]),
                    },
                },
            )
        except Exception as exc:
            return {
                **core_verdict,
                "_validation_witness": {
                    "checked": False,
                    "congruent": False,
                    "reason": f"validation exception: {exc}",
                },
            }
        finally:
            os.chdir(old_cwd)

    def _reconcile_after_articulation(self, stimulus, articulated_text, validation_result):
        reconciliation_stimulus = {
            "type": "post_articulation_reconciliation",
            "content": articulated_text,
            "original_stimulus_hash": self._hash(stimulus),
        }
        reconciliation_logic = {
            "active_mode": "GUARD",
            "bayes_guard_prob": 0.9,
            "bayes_habit_prob": 0.1,
            "bayes_jump_prob": 0.1,
            "field_density": len(self.hlsf.field_map),
        }
        envelope = self.governance.process(reconciliation_stimulus, reconciliation_logic)
        witness = validation_result.get("_validation_witness", {})
        passed = bool(envelope.infra_audit_passed and witness.get("checked") and witness.get("congruent", False))
        reason = None
        if not passed:
            reason = {
                "infra_audit_passed": envelope.infra_audit_passed,
                "validation_checked": witness.get("checked", False),
                "validation_congruent": witness.get("congruent", False),
                "validation_reason": witness.get("reason"),
            }
        return {
            "passed": passed,
            "reason": reason,
            "envelope": envelope,
        }

    def _build_final_payload(
        self,
        stimulus,
        envelope,
        validation_result,
        reconciliation,
        articulated_text,
        raw_input_hash,
        logic_state,
        pulse,
    ):
        witness = validation_result.get("_validation_witness", {})
        return {
            "final_text": articulated_text,
            "response": articulated_text,
            "pulse": pulse,
            "envelope_id": envelope.envelope_id,
            "trust_state": envelope.trust_state.value,
            "raw_input_hash": raw_input_hash,
            "response_hash": self._hash({"response": articulated_text}),
            "ddr_score": envelope.ddr_score,
            "alert_level": envelope.alert_level.name,
            "cognitive_mode": self._mode_value(envelope.cognitive_state.active_mode if envelope.cognitive_state else "GUARD"),
            "logic_state": logic_state,
            "reconciliation_passed": reconciliation["passed"],
            "reconciliation_reason": reconciliation["reason"],
            "module_status": self.module_status(),
            "observer_annotations": list(envelope.observer_annotations),
            "validation_status": {
                "checked": witness.get("checked", False),
                "congruent": witness.get("congruent", False),
                "signed_envelope_id": witness.get("signed_envelope_id"),
                "content_hash": witness.get("content_hash"),
                "reason": witness.get("reason"),
            },
            "bayesian_status": validation_result.get("bayesian_status", {}),
            "vault_status": validation_result.get("vault_status", {}),
            "tribunal_status": validation_result.get("tribunal_status", {}),
            "hlsf_status": validation_result.get("hlsf_status", {}),
            "governance_envelope": self._envelope_reference(envelope),
        }

    def _envelope_reference(self, envelope):
        return {
            "envelope_id": envelope.envelope_id,
            "trust_state": envelope.trust_state.value,
            "hash": envelope.compute_hash(),
            "raw_input_hash": envelope.raw_input_hash,
            "ddr_score": envelope.ddr_score,
            "alert_level": envelope.alert_level.name,
        }

    def _mode_value(self, active_mode: str) -> str:
        if "INTUITION" in str(active_mode):
            return CognitiveMode.INTUITION.value
        if "HABIT" in str(active_mode):
            return CognitiveMode.HABIT.value
        return CognitiveMode.GUARD.value

    def _hash(self, payload: Any) -> str:
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    def module_status(self) -> Dict[str, Dict[str, Any]]:
        status = copy.deepcopy(self._module_status)
        status["BayesianEngine"]["prior_count"] = len(self.bayesian.priors)
        status["VaultManager"]["apriori_truths"] = len(self.vault.canonical_truths)
        status["HLSF engine"]["field_density"] = len(self.hlsf.field_map)
        status["FourMindTribunal"]["lenses_loaded"] = sorted(self.tribunal.minds.keys())
        return status
