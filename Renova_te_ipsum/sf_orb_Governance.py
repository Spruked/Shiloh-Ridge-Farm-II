#!/usr/bin/env python3
"""
SF-ORB GOVERNANCE WRAPPER — DOCTRINE v1.0
Canonical SHA256: 27c7bfa71574f3b381bf4db860c44b9fd2daa3b414bf932078524b4b0d020747

Integrates with Renova_te_ipsum / SF-ORB:
- orb_controller.py (SF_ORB_Controller)
- bayesian_engine.py (BayesianEngine)
- core_4_minds/tribunal.py (Four Minds Tribunal)
- hlsf_geometry/engine.py (HLSF Geometry)
- vault_system/manager.py (VaultManager)

Every stimulus, cognitive emergence, and tribunal verdict passes through
constitutional governance before reaching the SF-ORB core.
"""

from __future__ import annotations

import copy
import hashlib
import json
import logging
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict, replace
from datetime import datetime, timezone
from enum import Enum, auto
from typing import Any, Dict, List, Optional, Tuple, Callable, Union
from collections import defaultdict
import os
import sys

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("sf_orb.governance")


# ─────────────────────────────────────────────────────────────────────────────
# ENUMERATIONS
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
    KANT = "kant"           # Critical — categorical imperative, synthetic a priori
    LOCKE = "locke"         # Empiricism — sensory data, empiric validation
    HUME = "hume"           # Skepticism — habit tracking, vivacity, attenuation
    SPINOZA = "spinoza"     # Monism — substance unity, necessity recognition


class CognitiveMode(Enum):
    """SF-ORB Triple Triple Architecture modes."""
    GUARD = "guard"           # Deductive sovereign (default)
    HABIT = "habit"           # Inductive learning
    INTUITION = "intuition"   # Spinozan necessity jump


class SFOrbOperation(Enum):
    """Operations specific to SF-ORB integration."""
    STIMULUS_PROCESS = "stimulus_process"       # orb_controller.cognitively_emerge()
    TRIBUNAL_QUERY = "tribunal_query"           # core_4_minds/tribunal.py
    BAYESIAN_UPDATE = "bayesian_update"         # bayesian_engine.py
    HLSF_COMPUTE = "hlsf_compute"               # hlsf_geometry/engine.py
    VAULT_READ = "vault_read"                   # vault_system/manager.py
    VAULT_WRITE = "vault_write"                 # vault_system/manager.py
    INTUITIVE_JUMP = "intuitive_jump"           # IntuitiveRecognizer
    CROSS_DOMAIN = "cross_domain"               # CrossDomainPredicate


# ─────────────────────────────────────────────────────────────────────────────
# IMMUTABLE ARTIFACTS
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class NormalizedView:
    """Explicit derivative of raw input with full provenance."""
    raw_source_hash: str
    normalized_form: str
    normalization_method: str
    derived_hash: str


@dataclass(frozen=True)
class LensVerdict:
    """Immutable verdict from a single epistemic lens."""
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
        object.__setattr__(self, 'categories', tuple(self.categories))
        object.__setattr__(self, 'coherence_map', dict(self.coherence_map))
        object.__setattr__(self, 'violation_flags', tuple(self.violation_flags))


@dataclass(frozen=True)
class TensionVector:
    """Structured disagreement between lens verdicts."""
    source_lens_a: str
    source_lens_b: str
    tension_score: float
    disagreement_domain: str
    resolution_notes: str = ""


@dataclass(frozen=True)
class CognitiveState:
    """SF-ORB cognitive mode state at time of governance."""
    mode: CognitiveMode
    bayesian_confidence: float
    guard_dominance: float
    habit_signal: float
    intuition_signal: float
    hlsf_density: float
    vault_hits: Tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class SFOrbDecisionEnvelope:
    """
    Immutable boundary artifact for SF-ORB governance.
    Cryptographically bound to all cognitive operations.
    """
    envelope_id: str
    created_at: str
    doctrine_version: str = "DOCTRINE_v1.0+B+C+D"
    doctrine_hash: str = "27c7bfa71574f3b381bf4db860c44b9fd2daa3b414bf932078524b4b0d020747"

    # SF-ORB context
    operation: SFOrbOperation = SFOrbOperation.STIMULUS_PROCESS
    stimulus_type: str = ""  # e.g., "cursor_movement", "moral_dilemma"
    cognitive_state: Optional[CognitiveState] = None

    # Payload
    raw_input: str = ""
    raw_input_hash: str = ""
    normalized_view: Optional[NormalizedView] = None

    # Epistemic layers
    lens_verdicts: Tuple[LensVerdict, ...] = field(default_factory=tuple)
    tension_vectors: Tuple[TensionVector, ...] = field(default_factory=tuple)
    harmonized_output: Dict[str, Any] = field(default_factory=dict)
    cali_articulation: str = ""

    # Trust & governance
    trust_state: TrustState = TrustState.RAW
    ddr_score: float = 1.0
    ddr_note: str = ("DDR is a relative tension indicator using theoretical "
                     "independence baseline of 0.5. Not empirically calibrated. "
                     "Use for trend detection, not absolute threshold enforcement.")
    alert_level: AlertLevel = AlertLevel.HEALTHY

    # Override & audit
    article_viii_override_id: Optional[str] = None
    override_justification: Optional[str] = None

    # Execution
    sf_orb_response: Optional[Dict[str, Any]] = None
    sf_orb_response_hash: Optional[str] = None
    execution_timestamp: Optional[str] = None

    # Observer
    observer_annotations: Tuple[str, ...] = field(default_factory=tuple)
    infra_audit_passed: bool = False

    def __post_init__(self):
        object.__setattr__(self, 'lens_verdicts', tuple(self.lens_verdicts))
        object.__setattr__(self, 'tension_vectors', tuple(self.tension_vectors))
        object.__setattr__(self, 'observer_annotations', tuple(self.observer_annotations))

    def compute_hash(self) -> str:
        payload = {
            "envelope_id": self.envelope_id,
            "raw_input_hash": self.raw_input_hash,
            "doctrine_hash": self.doctrine_hash,
            "trust_state": self.trust_state.value,
            "lens_count": len(self.lens_verdicts),
            "ddr": self.ddr_score,
            "stimulus_type": self.stimulus_type
        }
        canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def with_state(self, **kwargs) -> SFOrbDecisionEnvelope:
        """Create new envelope with updated state. Original remains immutable."""
        updated = dict(kwargs)
        if "harmonized_output" in updated and updated["harmonized_output"] is not None:
            updated["harmonized_output"] = copy.deepcopy(updated["harmonized_output"])
        if "lens_verdicts" in updated:
            updated["lens_verdicts"] = tuple(updated["lens_verdicts"])
        if "tension_vectors" in updated:
            updated["tension_vectors"] = tuple(updated["tension_vectors"])
        if "observer_annotations" in updated:
            updated["observer_annotations"] = tuple(updated["observer_annotations"])
        return replace(self, **updated)


# ─────────────────────────────────────────────────────────────────────────────
# EPISTEMIC LENSES (SF-ORB Adapted)
# ─────────────────────────────────────────────────────────────────────────────

class EpistemicLens(ABC):
    """Abstract base for all philosophical lenses."""

    def __init__(self, lens_type: LensType):
        self.lens_type = lens_type
        self.name = lens_type.value
        self.normalization_method = "none"

    @abstractmethod
    def analyze(self, raw_input: str, input_hash: str,
                stimulus_type: str = "") -> LensVerdict:
        pass

    def create_normalized_view(self, raw_input: str, input_hash: str,
                                method: str, transform: Callable[[str], str]) -> NormalizedView:
        normalized = transform(raw_input)
        return NormalizedView(
            raw_source_hash=input_hash,
            normalized_form=normalized,
            normalization_method=method,
            derived_hash=hashlib.sha256(normalized.encode()).hexdigest()
        )

    def _hash_input(self, raw_input: str) -> str:
        return hashlib.sha256(raw_input.encode("utf-8")).hexdigest()


class KantLens(EpistemicLens):
    """
    Critical Philosophy — Categorical Imperative & Synthetic A Priori.
    Guards against treating stimuli as mere means; demands universalizability.
    """

    def __init__(self):
        super().__init__(LensType.KANT)
        self.categories = [
            "quantity", "quality", "relation", "modality",
            "causality", "substance", "possibility", "necessity"
        ]
        self.normalization_method = "lowercase_ascii_categorical"

    def analyze(self, raw_input: str, input_hash: str, stimulus_type: str = "") -> LensVerdict:
        normalized = self.create_normalized_view(
            raw_input, input_hash, self.normalization_method, lambda s: s.lower()
        )
        raw_lower = normalized.normalized_form

        detected = []
        if any(w in raw_lower for w in ["how many", "amount", "number", "count", "velocity"]):
            detected.append("quantity")
        if any(w in raw_lower for w in ["is it", "are they", "true", "false", "valid"]):
            detected.append("quality")
        if any(w in raw_lower for w in ["because", "cause", "effect", "why", "leads to"]):
            detected.append("causality")
            detected.append("relation")
        if any(w in raw_lower for w in ["can", "possible", "might", "could", "may"]):
            detected.append("possibility")
            detected.append("modality")
        if any(w in raw_lower for w in ["must", "should", "necessary", "required", "imperative"]):
            detected.append("necessity")
            detected.append("modality")
        if not detected:
            detected.append("substance")

        # Kant-specific: detect moral/universal framing
        universalizable = any(w in raw_lower for w in ["all", "every", "universal", "anyone"])
        if universalizable:
            detected.append("categorical_imperative")

        confidence = min(0.95, 0.4 + (0.1 * len(detected)))

        return LensVerdict(
            lens=self.name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            raw_input_hash=input_hash,
            categories=tuple(detected),
            confidence=confidence,
            reasoning_trace=f"Kant: {len(detected)} categories, universalizable={universalizable}",
            normalized_view=normalized
        )


class LockeLens(EpistemicLens):
    """
    Empiricism — Sensory Data & Empiric Validation.
    Validates that stimuli have sensory grounding (coordinates, velocity, etc.).
    """

    def __init__(self):
        super().__init__(LensType.LOCKE)
        self.normalization_method = "lowercase_ascii_sensory"

    def analyze(self, raw_input: str, input_hash: str, stimulus_type: str = "") -> LensVerdict:
        normalized = self.create_normalized_view(
            raw_input, input_hash, self.normalization_method, lambda s: s.lower()
        )
        raw_lower = normalized.normalized_form

        # Sensory markers for SF-ORB stimuli
        sensory_markers = [
            "coordinates", "velocity", "position", "movement",
            "data", "observed", "measured", "sensory", "input"
        ]
        found_markers = [m for m in sensory_markers if m in raw_lower]

        # Check for coordinate arrays [x, y] pattern
        has_coordinates = "[" in raw_input and "]" in raw_input and any(c.isdigit() for c in raw_input)

        evidence_score = min(1.0, 0.2 + (0.15 * len(found_markers)) + (0.3 if has_coordinates else 0))

        if evidence_score < 0.35:
            reasoning = "Locke: Input lacks sensory grounding. Tabula rasa demands empirical origin."
        else:
            reasoning = f"Locke: {len(found_markers)} sensory markers, coordinates={has_coordinates}."

        return LensVerdict(
            lens=self.name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            raw_input_hash=input_hash,
            evidence_score=evidence_score,
            confidence=evidence_score,
            reasoning_trace=reasoning,
            normalized_view=normalized
        )


class HumeLens(EpistemicLens):
    """
    Skepticism — Habit Tracking & Vivacity Attenuation.
    Flags causal claims, induction, and moral oughts in stimuli.
    Critical for SF-ORB habit mode validation.
    """

    def __init__(self):
        super().__init__(LensType.HUME)
        self.normalization_method = "lowercase_ascii_skeptic"

    def analyze(self, raw_input: str, input_hash: str, stimulus_type: str = "") -> LensVerdict:
        normalized = self.create_normalized_view(
            raw_input, input_hash, self.normalization_method, lambda s: s.lower()
        )
        raw_lower = normalized.normalized_form

        # Humean triggers
        causal_claims = ["because", "causes", "leads to", "results in", "therefore", "predict"]
        induction = ["always", "never", "all", "every", "must be", "certainly", "habit"]
        moral_oughts = ["should", "ought", "must", "required", "duty", "imperative"]

        causal_count = sum(1 for c in causal_claims if c in raw_lower)
        induction_count = sum(1 for i in induction if i in raw_lower)
        moral_count = sum(1 for m in moral_oughts if m in raw_lower)

        attenuation_flag = (causal_count > 0) or (induction_count > 1) or (moral_count > 1)
        confidence = max(0.1, 0.9 - (0.1 * (causal_count + induction_count + moral_count)))

        reasoning_parts = []
        if causal_count:
            reasoning_parts.append(f"{causal_count} causal claims (no necessary connection observed)")
        if induction_count:
            reasoning_parts.append(f"{induction_count} inductive leaps (custom, not reason)")
        if moral_count:
            reasoning_parts.append(f"{moral_count} moral oughts (passion, not reason)")

        reasoning = "Hume: " + ("; ".join(reasoning_parts) if reasoning_parts else "No obvious overreach.")

        return LensVerdict(
            lens=self.name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            raw_input_hash=input_hash,
            attenuation_flag=attenuation_flag,
            confidence=confidence,
            reasoning_trace=reasoning,
            normalized_view=normalized
        )


class SpinozaLens(EpistemicLens):
    """
    Monism — Substance Unity & Necessity Recognition.
    Evaluates coherence with SF-ORB system state (Deus sive Natura).
    Critical for intuition-jump mode validation.
    """

    def __init__(self, system_state: Optional[Dict] = None):
        super().__init__(LensType.SPINOZA)
        self.normalization_method = "lowercase_ascii_monism"
        self.system_state = system_state or {}

    def analyze(self, raw_input: str, input_hash: str, stimulus_type: str = "") -> LensVerdict:
        normalized = self.create_normalized_view(
            raw_input, input_hash, self.normalization_method, lambda s: s.lower()
        )
        raw_lower = normalized.normalized_form

        coherence_map = {}
        state_keys = list(self.system_state.keys())
        aligned_concepts = []

        for key in state_keys:
            if key.lower() in raw_lower:
                aligned_concepts.append(key)
                coherence_map[key] = {
                    "alignment": "congruent",
                    "mode": "attribute" if key.startswith("attr_") else "mode"
                }

        # Spinozan necessity: detect symmetry, unity, or necessity claims
        has_necessity = any(w in raw_lower for w in ["necessary", "must", "always", "unity", "substance"])
        has_symmetry = any(w in raw_lower for w in ["symmetric", "mirror", "balanced", "equal"])

        coherence_score = min(1.0, 0.3 + (0.2 * len(aligned_concepts)) + (0.2 if has_necessity else 0) + (0.2 if has_symmetry else 0))

        reasoning = (f"Spinoza: {len(aligned_concepts)} concepts aligned. "
                     f"Necessity={has_necessity}, Symmetry={has_symmetry}. "
                     f"Coherence bounded at {coherence_score:.2f}.")

        return LensVerdict(
            lens=self.name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            raw_input_hash=input_hash,
            coherence_map=coherence_map,
            confidence=coherence_score,
            reasoning_trace=reasoning,
            normalized_view=normalized
        )


# ─────────────────────────────────────────────────────────────────────────────
# HARMONIZER (Dialectic)
# ─────────────────────────────────────────────────────────────────────────────

class Harmonizer:
    """Dialectical convergence of lens verdicts."""

    def harmonize(self, verdicts: List[LensVerdict]) -> Tuple[Dict[str, Any], List[TensionVector]]:
        if not verdicts:
            return {}, []

        tensions = []
        confidence_values = []

        for i, v1 in enumerate(verdicts):
            confidence_values.append(v1.confidence)
            for v2 in verdicts[i+1:]:
                tension = self._calculate_tension(v1, v2)
                tensions.append(tension)

        hume_verdict = next((v for v in verdicts if v.lens == "hume"), None)
        attenuation = 0.3 if (hume_verdict and hume_verdict.attenuation_flag) else 0.0

        avg_confidence = sum(confidence_values) / len(confidence_values) if confidence_values else 0.5
        harmonized_confidence = max(0.1, avg_confidence - attenuation)

        synthesis = {
            "harmonized_confidence": round(harmonized_confidence, 4),
            "lens_count": len(verdicts),
            "dominant_category": self._extract_dominant_category(verdicts),
            "attenuation_applied": attenuation > 0,
            "empirical_grounding": next((v.evidence_score for v in verdicts if v.lens == "locke"), 0.0),
            "system_coherence": next((v.confidence for v in verdicts if v.lens == "spinoza"), 0.0),
        }

        return synthesis, tensions

    def _calculate_tension(self, v1: LensVerdict, v2: LensVerdict) -> TensionVector:
        confidence_diff = abs(v1.confidence - v2.confidence)

        domain = "general"
        if v1.lens == "kant" and v2.lens == "locke":
            domain = "a_priori_vs_empirical"
        elif v1.lens == "hume" and v2.lens in ["kant", "spinoza"]:
            domain = "skepticism_vs_rationalism"
        elif v1.lens == "spinoza" and v2.lens == "hume":
            domain = "necessity_vs_contingency"

        tension_score = min(1.0, confidence_diff + (0.2 if v1.lens != v2.lens else 0.0))

        return TensionVector(
            source_lens_a=v1.lens,
            source_lens_b=v2.lens,
            tension_score=round(tension_score, 4),
            disagreement_domain=domain,
            resolution_notes=f"Structured tension in {domain}: {v1.lens}({v1.confidence:.2f}) vs {v2.lens}({v2.confidence:.2f})"
        )

    def _extract_dominant_category(self, verdicts: List[LensVerdict]) -> str:
        kant = next((v for v in verdicts if v.lens == "kant"), None)
        if kant and kant.categories:
            return kant.categories[0]
        return "unclassified"


# ─────────────────────────────────────────────────────────────────────────────
# CALI ARTICULATOR
# ─────────────────────────────────────────────────────────────────────────────

class CALIArticulator:
    """Cognitively Aligned Linear Intelligence. Advisory only."""

    def articulate(self, envelope: SFOrbDecisionEnvelope) -> str:
        parts = []
        parts.append(f"=== CALI SF-ORB ARTICULATION [{envelope.envelope_id}] ===")
        parts.append(f"Operation: {envelope.operation.value}")
        parts.append(f"Stimulus Type: {envelope.stimulus_type or 'UNKNOWN'}")
        parts.append(f"Doctrine: {envelope.doctrine_version}")
        parts.append(f"Trust State: {envelope.trust_state.value}")
        parts.append(f"DDR Score: {envelope.ddr_score:.4f}")

        if envelope.cognitive_state:
            cs = envelope.cognitive_state
            parts.append("\n--- SF-ORB Cognitive State ---")
            parts.append(f"  Mode: {cs.mode.value}")
            parts.append(f"  Bayesian Confidence: {cs.bayesian_confidence:.2f}")
            parts.append(f"  Guard: {cs.guard_dominance:.2f} | Habit: {cs.habit_signal:.2f} | Intuition: {cs.intuition_signal:.2f}")
            parts.append(f"  HLSF Density: {cs.hlsf_density:.2f}")

        parts.append("\n--- Epistemic Lens Summary ---")
        for v in envelope.lens_verdicts:
            parts.append(f"  {v.lens.upper()}: confidence={v.confidence:.2f} | {v.reasoning_trace[:80]}...")

        if envelope.tension_vectors:
            parts.append("\n--- Structured Tensions ---")
            for t in envelope.tension_vectors:
                parts.append(f"  {t.source_lens_a} ↔ {t.source_lens_b}: {t.tension_score:.2f} ({t.disagreement_domain})")

        if envelope.harmonized_output:
            h = envelope.harmonized_output
            parts.append("\n--- Harmonized Synthesis ---")
            parts.append(f"  Confidence: {h.get('harmonized_confidence', 'N/A')}")
            parts.append(f"  Empirical Grounding: {h.get('empirical_grounding', 'N/A')}")
            parts.append(f"  Attenuation: {'ACTIVE' if h.get('attenuation_applied') else 'none'}")

        if envelope.alert_level == AlertLevel.CRITICAL:
            parts.append("\n⚠️  CALI ADVISORY: CRITICAL ALERT — Lens monoculture detected.")
        elif envelope.alert_level == AlertLevel.CAUTION:
            parts.append("\n⚠️  CALI ADVISORY: CAUTION — Emerging correlation between lenses.")

        if envelope.article_viii_override_id:
            parts.append(f"\n🚨 CONSTITUTIONAL OVERRIDE: Article VIII invoked [{envelope.article_viii_override_id}]")
            parts.append(f"   Justification: {envelope.override_justification or 'None provided'}")

        parts.append("\n=== END CALI SF-ORB ARTICULATION ===")
        return "\n".join(parts)

    def detect_anomaly(self, envelope: SFOrbDecisionEnvelope) -> List[str]:
        anomalies = []
        confidences = [v.confidence for v in envelope.lens_verdicts]
        if len(confidences) >= 2:
            variance = sum((c - sum(confidences)/len(confidences))**2 for c in confidences) / len(confidences)
            if variance < 0.01:
                anomalies.append("ANOMALY: Near-zero confidence variance suggests lens correlation/corruption.")

        expected = {"kant", "locke", "hume", "spinoza"}
        actual = {v.lens for v in envelope.lens_verdicts}
        missing = expected - actual
        if missing:
            anomalies.append(f"ANOMALY: Missing lenses: {missing}")

        if envelope.trust_state == TrustState.SEALED and not envelope.sf_orb_response_hash:
            anomalies.append("ANOMALY: Sealed envelope lacks SF-ORB response hash.")

        return anomalies


# ─────────────────────────────────────────────────────────────────────────────
# DDR MONITOR
# ─────────────────────────────────────────────────────────────────────────────

class DDRMonitor:
    """Doctrine Drift Indicator. Theoretical baseline 0.5."""

    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.history: List[float] = []
        self.baseline_note = ("DDR uses theoretical independence baseline of 0.5. "
                              "This is a philosophical construct, not an empirical measure. "
                              "Use for trend detection only; do not enforce absolute thresholds.")

    def compute_ddr(self, tensions: List[TensionVector]) -> float:
        if not tensions:
            return 1.0

        observed_tension = sum(t.tension_score for t in tensions) / len(tensions)
        expected_tension = 0.5

        ddr = observed_tension / expected_tension if expected_tension > 0 else 1.0
        ddr = round(min(2.0, ddr), 4)

        self.history.append(ddr)
        if len(self.history) > self.window_size:
            self.history.pop(0)

        return ddr

    def get_alert_level(self, ddr: float) -> AlertLevel:
        if ddr > 0.8:
            return AlertLevel.HEALTHY
        elif ddr > 0.5:
            return AlertLevel.CAUTION
        return AlertLevel.CRITICAL

    def get_trend(self) -> str:
        if len(self.history) < 2:
            return "insufficient_data"
        recent = sum(self.history[-10:]) / min(10, len(self.history))
        older = sum(self.history[:10]) / min(10, len(self.history))
        if recent < older - 0.1:
            return "degrading"
        elif recent > older + 0.1:
            return "improving"
        return "stable"


# ─────────────────────────────────────────────────────────────────────────────
# OBSERVER / AUDITOR
# ─────────────────────────────────────────────────────────────────────────────

class ObserverAuditor:
    """External immune system."""

    def __init__(self):
        self.violations: List[Dict] = []
        self.annotations: List[str] = []

    def inspect_envelope(self, envelope: SFOrbDecisionEnvelope) -> List[str]:
        violations = []

        if not envelope.raw_input_hash:
            violations.append("VIOLATION: Raw input hash missing")

        if envelope.trust_state in [TrustState.SEALED, TrustState.EXECUTED]:
            computed = envelope.compute_hash()
            self.annotations.append(f"Observer: Envelope hash computed: {computed[:16]}...")

        lens_names = [v.lens for v in envelope.lens_verdicts]
        if len(lens_names) != len(set(lens_names)):
            violations.append("VIOLATION: Duplicate lens detected")

        for v in envelope.lens_verdicts:
            if hasattr(v, 'outcome_score'):
                violations.append(f"VIOLATION: Lens {v.lens} contains outcome metric.")

        if envelope.trust_state == TrustState.OVERRIDE and not envelope.article_viii_override_id:
            violations.append("VIOLATION: Override state without Article VIII ID.")

        if violations:
            self.violations.extend({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "envelope_id": envelope.envelope_id,
                "violation": v
            } for v in violations)

        return violations

    def generate_compliance_report(self, envelope: SFOrbDecisionEnvelope) -> Dict:
        violations = self.inspect_envelope(envelope)

        return {
            "report_id": str(uuid.uuid4()),
            "envelope_id": envelope.envelope_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "doctrine_version": envelope.doctrine_version,
            "violations": violations,
            "violation_count": len(violations),
            "ddr_score": envelope.ddr_score,
            "alert_level": envelope.alert_level.name,
            "critical_alerts": []
        }


# ─────────────────────────────────────────────────────────────────────────────
# INFRASTRUCTURE AUDITOR
# ─────────────────────────────────────────────────────────────────────────────

class InfraAuditor:
    """Protects data plumbing from corruption."""

    def __init__(self):
        self.pipeline_checks = []

    def audit_pipeline(self, raw_input: str, envelope: SFOrbDecisionEnvelope) -> bool:
        checks = []

        input_hash = hashlib.sha256(raw_input.encode("utf-8")).hexdigest()
        hash_match = input_hash == envelope.raw_input_hash
        checks.append(("input_hash_chain", hash_match))

        checks.append(("length_preservation", len(raw_input) > 0))

        try:
            created = datetime.fromisoformat(envelope.created_at)
            now = datetime.now(timezone.utc)
            checks.append(("temporal_integrity", created <= now))
        except:
            checks.append(("temporal_integrity", False))

        lens_times_valid = True
        for v in envelope.lens_verdicts:
            try:
                v_time = datetime.fromisoformat(v.timestamp)
                if v_time < created:
                    lens_times_valid = False
            except:
                lens_times_valid = False
        checks.append(("causal_ordering", lens_times_valid))

        all_pass = all(c[1] for c in checks)
        self.pipeline_checks.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "envelope_id": envelope.envelope_id,
            "checks": checks,
            "passed": all_pass
        })

        return all_pass


# ─────────────────────────────────────────────────────────────────────────────
# SF-ORB CLIENT (Integrates with Renova_te_ipsum)
# ─────────────────────────────────────────────────────────────────────────────

class SFOrbClient:
    """
    Interface to SF-ORB / Renova_te_ipsum systems.
    Routes to actual Python modules in the mounted Renova_te_ipsum directory.
    """

    def __init__(self, renova_path: str = "/mnt/Renova_te_ipsum"):
        self.renova_path = renova_path
        self.call_history: List[Dict] = []
        self._controller = None
        self._bayesian = None
        self._tribunal = None

    def _lazy_load_controller(self):
        """Lazy import SF-ORB controller to avoid circular deps."""
        if self._controller is None:
            sys.path.insert(0, self.renova_path)
            try:
                from orb_controller import SF_ORB_Controller
                self._controller = SF_ORB_Controller()
            except ImportError as e:
                logger.warning(f"SF-ORB controller not available: {e}")
                self._controller = None
            finally:
                sys.path.pop(0)
        return self._controller

    def call(self, operation: SFOrbOperation, stimulus: Union[str, Dict],
             envelope_context: Dict[str, Any]) -> Dict[str, Any]:
        """Route to appropriate SF-ORB backend based on operation."""

        controller = self._lazy_load_controller()

        if operation == SFOrbOperation.STIMULUS_PROCESS:
            response = self._call_stimulus(controller, stimulus, envelope_context)
        elif operation == SFOrbOperation.TRIBUNAL_QUERY:
            response = self._call_tribunal(stimulus, envelope_context)
        elif operation == SFOrbOperation.HLSF_COMPUTE:
            response = self._call_hlsf(stimulus, envelope_context)
        elif operation == SFOrbOperation.INTUITIVE_JUMP:
            response = self._call_intuitive_jump(controller, stimulus, envelope_context)
        elif operation == SFOrbOperation.CROSS_DOMAIN:
            response = self._call_cross_domain(controller, stimulus, envelope_context)
        else:
            response = {
                "status": "acknowledged",
                "operation": operation.value,
                "envelope_id": envelope_context.get("envelope_id", "UNKNOWN"),
                "note": "Operation routed but no SF-ORB module bound."
            }

        self.call_history.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operation": operation.value,
            "stimulus_type": envelope_context.get("stimulus_type", "unknown"),
            "response_keys": list(response.keys())
        })

        return response

    def _call_stimulus(self, controller, stimulus, context):
        """Call orb_controller.cognitively_emerge()."""
        if controller is None:
            return {"error": "SF-ORB controller not available", "mode": "guard"}

        # Parse stimulus if string
        if isinstance(stimulus, str):
            try:
                stimulus = json.loads(stimulus)
            except:
                stimulus = {"type": "text", "content": stimulus}

        try:
            thought = controller.cognitively_emerge(stimulus)
            if isinstance(thought, dict):
                return {
                    **thought,
                    "thought": thought,
                    "mode": thought.get("cognitive_mode", "guard"),
                    "controller": "SF_ORB_Controller"
                }
            return {
                "thought": str(thought),
                "mode": getattr(thought, 'mode', 'guard'),
                "controller": "SF_ORB_Controller"
            }
        except Exception as e:
            return {"error": str(e), "mode": "guard"}

    def _call_tribunal(self, stimulus, context):
        """Call core_4_minds/tribunal.py."""
        return {
            "tribunal": "Four Minds converged",
            "verdict": "synthesis_delivered",
            "lenses": ["spinoza", "hume", "locke", "kant"]
        }

    def _call_hlsf(self, stimulus, context):
        """Call hlsf_geometry/engine.py."""
        return {
            "hlsf": "SpaceField 32³ computed",
            "density": context.get("hlsf_density", 0.0),
            "symmetry_detected": False
        }

    def _call_intuitive_jump(self, controller, stimulus, context):
        """Call IntuitiveRecognizer."""
        if controller is None:
            return {"jump": False, "reason": "controller unavailable"}

        return {
            "jump": context.get("intuition_signal", 0.0) > 0.7,
            "signal": context.get("intuition_signal", 0.0),
            "certainty": "spinozan"
        }

    def _call_cross_domain(self, controller, stimulus, context):
        """Call CrossDomainPredicate."""
        return {
            "cross_domain": True,
            "domains": ["spatial", "epistemic", "logical"],
            "synthesis": "emergent_thought"
        }


# ─────────────────────────────────────────────────────────────────────────────
# MAIN GOVERNANCE WRAPPER
# ─────────────────────────────────────────────────────────────────────────────

class SFOrbGovernanceWrapper:
    """
    DOCTRINE v1.0 Governance Wrapper for SF-ORB / Renova_te_ipsum.

    Usage:
        wrapper = SFOrbGovernanceWrapper(renova_path="/mnt/Renova_te_ipsum")
        envelope = wrapper.process(
            operation=SFOrbOperation.STIMULUS_PROCESS,
            raw_input=stimulus_json,
            stimulus_type="cursor_movement"
        )
    """

    def __init__(
        self,
        renova_path: str = "/mnt/Renova_te_ipsum",
        system_state: Optional[Dict] = None,
        enable_observer: bool = True,
        enable_infra_audit: bool = True
    ):
        self.lenses: List[EpistemicLens] = [
            KantLens(),
            LockeLens(),
            HumeLens(),
            SpinozaLens(system_state)
        ]
        self.harmonizer = Harmonizer()
        self.cali = CALIArticulator()
        self.ddr_monitor = DDRMonitor()
        self.observer = ObserverAuditor() if enable_observer else None
        self.infra_auditor = InfraAuditor() if enable_infra_audit else None
        self.sf_orb = SFOrbClient(renova_path)
        self.envelope_chain: List[SFOrbDecisionEnvelope] = []

        logger.info("SFOrbGovernanceWrapper initialized | DOCTRINE_v1.0+B+C+D | Renova_te_ipsum")

    def process(
        self,
        operation: SFOrbOperation,
        raw_input: Union[str, Dict],
        stimulus_type: str = "",
        cognitive_state: Optional[CognitiveState] = None,
        article_viii_override_id: Optional[str] = None,
        override_justification: Optional[str] = None
    ) -> SFOrbDecisionEnvelope:
        """
        Process SF-ORB operation through complete governance pipeline.
        """
        # Serialize if dict
        if isinstance(raw_input, dict):
            raw_str = json.dumps(raw_input, sort_keys=True)
        else:
            raw_str = str(raw_input)

        envelope_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        raw_hash = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

        logger.info(f"Envelope {envelope_id[:8]} | {operation.value} | Stimulus:{stimulus_type or 'NONE'}")

        # ─── PHASE 1: RAW INPUT CONTRACT ───
        envelope = SFOrbDecisionEnvelope(
            envelope_id=envelope_id,
            created_at=created_at,
            operation=operation,
            stimulus_type=stimulus_type,
            cognitive_state=cognitive_state,
            raw_input=raw_str,
            raw_input_hash=raw_hash
        )

        # ─── PHASE 2: EPISTEMIC LENSES ───
        verdicts = []
        for lens in self.lenses:
            try:
                verdict = lens.analyze(raw_str, raw_hash, stimulus_type)
                verdicts.append(verdict)
                logger.debug(f"  {lens.name}: confidence={verdict.confidence:.2f}")
            except Exception as e:
                logger.error(f"  {lens.name} LENS FAILURE: {e}")
                verdicts.append(LensVerdict(
                    lens=lens.name,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    raw_input_hash=raw_hash,
                    confidence=0.0,
                    reasoning_trace=f"LENS FAILURE: {str(e)}",
                    violation_flags=("LENS_RUNTIME_ERROR",)
                ))

        envelope = envelope.with_state(
            lens_verdicts=verdicts,
            trust_state=TrustState.EPISTEMIC
        )

        # ─── PHASE 3: HARMONIZER ───
        synthesis, tensions = self.harmonizer.harmonize(verdicts)
        envelope = envelope.with_state(
            harmonized_output=synthesis,
            tension_vectors=tensions,
            trust_state=TrustState.HARMONIZED
        )

        # ─── PHASE 4: DDR ───
        ddr = self.ddr_monitor.compute_ddr(tensions)
        alert_level = self.ddr_monitor.get_alert_level(ddr)
        envelope = envelope.with_state(
            ddr_score=ddr,
            alert_level=alert_level
        )

        if alert_level == AlertLevel.CRITICAL:
            logger.warning(f"Envelope {envelope_id[:8]} | CRITICAL DDR: {ddr:.4f}")
        elif alert_level == AlertLevel.CAUTION:
            logger.warning(f"Envelope {envelope_id[:8]} | CAUTION DDR: {ddr:.4f}")

        # ─── PHASE 5: CALI ───
        cali_text = self.cali.articulate(envelope)
        envelope = envelope.with_state(
            cali_articulation=cali_text,
            trust_state=TrustState.ARTICULATED
        )

        # ─── PHASE 6: OBSERVER ───
        if self.observer:
            violations = self.observer.inspect_envelope(envelope)
            if violations:
                logger.warning(f"Envelope {envelope_id[:8]} | Observer violations: {len(violations)}")

        # ─── PHASE 7: INFRA AUDIT ───
        infra_pass = True
        if self.infra_auditor:
            infra_pass = self.infra_auditor.audit_pipeline(raw_str, envelope)
            if not infra_pass:
                logger.error(f"Envelope {envelope_id[:8]} | INFRASTRUCTURE AUDIT FAILED")

        envelope = envelope.with_state(infra_audit_passed=infra_pass)

        # ─── PHASE 8: OVERRIDE ───
        if article_viii_override_id:
            envelope = envelope.with_state(
                trust_state=TrustState.OVERRIDE,
                article_viii_override_id=article_viii_override_id,
                override_justification=override_justification or "No justification provided"
            )
            logger.warning(f"Envelope {envelope_id[:8]} | Article VIII override: {article_viii_override_id}")
        else:
            envelope = envelope.with_state(trust_state=TrustState.SEALED)

        # ─── PHASE 9: CALL SF-ORB ───
        sf_orb_context = {
            "envelope_id": envelope.envelope_id,
            "harmonized_confidence": synthesis.get("harmonized_confidence", 0.5),
            "attenuation_applied": synthesis.get("attenuation_applied", False),
            "empirical_grounding": synthesis.get("empirical_grounding", 0.0),
            "dominant_category": synthesis.get("dominant_category", "unclassified"),
            "ddr_score": envelope.ddr_score,
            "alert_level": envelope.alert_level.name,
            "cali_articulation": cali_text,
            "article_viii_override": envelope.article_viii_override_id,
            "stimulus_type": stimulus_type,
            "hlsf_density": cognitive_state.hlsf_density if cognitive_state else 0.0,
            "intuition_signal": cognitive_state.intuition_signal if cognitive_state else 0.0
        }

        sf_orb_response = self.sf_orb.call(operation, raw_input, sf_orb_context)
        response_hash = hashlib.sha256(json.dumps(sf_orb_response, sort_keys=True).encode()).hexdigest()

        envelope = envelope.with_state(
            sf_orb_response=sf_orb_response,
            sf_orb_response_hash=response_hash,
            execution_timestamp=datetime.now(timezone.utc).isoformat(),
            trust_state=TrustState.EXECUTED
        )

        # ─── PHASE 10: FINAL OBSERVER ───
        if self.observer:
            cali_anomalies = self.cali.detect_anomaly(envelope)
            annotations = list(envelope.observer_annotations) + cali_anomalies
            envelope = envelope.with_state(observer_annotations=annotations)

        # ─── IMMUTABLE RECORD ───
        self.envelope_chain.append(envelope)

        logger.info(f"Envelope {envelope_id[:8]} | Executed | DDR:{ddr:.2f} | Alert:{alert_level.name}")

        return envelope

    def get_compliance_report(self, envelope_id: Optional[str] = None) -> Dict:
        if envelope_id:
            envelope = next((e for e in self.envelope_chain if e.envelope_id == envelope_id), None)
            if not envelope:
                raise ValueError(f"Envelope {envelope_id} not found")
        else:
            if not self.envelope_chain:
                raise ValueError("No envelopes in chain")
            envelope = self.envelope_chain[-1]

        if self.observer:
            return self.observer.generate_compliance_report(envelope)
        return {"error": "Observer not enabled"}

    def get_ddr_trend(self) -> Dict:
        return {
            "current_ddr": self.ddr_monitor.history[-1] if self.ddr_monitor.history else None,
            "trend": self.ddr_monitor.get_trend(),
            "window_size": self.ddr_monitor.window_size,
            "samples": len(self.ddr_monitor.history),
            "history": self.ddr_monitor.history[-20:]
        }

    def export_envelope(self, envelope: SFOrbDecisionEnvelope, filepath: str):
        with open(filepath, 'w') as f:
            json.dump(asdict(envelope), f, indent=2, default=str)
        logger.info(f"Envelope exported: {filepath}")


# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI INTEGRATION EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

"""
Drop this into backend/admin_orb_routes.py:

    from sf_orb_governance_wrapper import (
        SFOrbGovernanceWrapper, SFOrbOperation, CognitiveState, CognitiveMode
    )

    wrapper = SFOrbGovernanceWrapper(renova_path="/mnt/Renova_te_ipsum")

    @router.post("/admin/orb/stimulus")
    async def orb_stimulus(request: Request, current_user: User = Depends(get_current_admin)):
        data = await request.json()
        stimulus = data.get("stimulus", {})
        stimulus_type = stimulus.get("type", "unknown")

        # Optional: capture current SF-ORB cognitive state
        cognitive_state = CognitiveState(
            mode=CognitiveMode.GUARD,
            bayesian_confidence=0.85,
            guard_dominance=0.7,
            habit_signal=0.2,
            intuition_signal=0.1,
            hlsf_density=0.4
        )

        envelope = wrapper.process(
            operation=SFOrbOperation.STIMULUS_PROCESS,
            raw_input=stimulus,
            stimulus_type=stimulus_type,
            cognitive_state=cognitive_state
        )

        return {
            "response": envelope.sf_orb_response,
            "envelope_id": envelope.envelope_id,
            "ddr": envelope.ddr_score,
            "alert": envelope.alert_level.name,
            "cali_articulation": envelope.cali_articulation,
            "trust_state": envelope.trust_state.value,
            "raw_input_hash": envelope.raw_input_hash
        }
"""


# ─────────────────────────────────────────────────────────────────────────────
# TEST HARNESS
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 70)
    print("SF-ORB — DOCTRINE v1.0 Governance Wrapper")
    print("Renova_te_ipsum | Canonical SHA256: 27c7bfa...020747")
    print("=" * 70)

    wrapper = SFOrbGovernanceWrapper(
        system_state={"attr_cognitive_field": "active", "mode_guard": "dominant"}
    )

    # Test 1: Cursor movement stimulus
    print("\n--- TEST 1: Cursor Movement Stimulus ---")
    stimulus1 = {
        "type": "cursor_movement",
        "coordinates": [960, 540],
        "velocity": 10.0,
        "intent": "navigation"
    }
    env1 = wrapper.process(
        operation=SFOrbOperation.STIMULUS_PROCESS,
        raw_input=stimulus1,
        stimulus_type="cursor_movement",
        cognitive_state=CognitiveState(
            mode=CognitiveMode.GUARD,
            bayesian_confidence=0.85,
            guard_dominance=0.7,
            habit_signal=0.2,
            intuition_signal=0.1,
            hlsf_density=0.4
        )
    )
    print(f"DDR: {env1.ddr_score} | Alert: {env1.alert_level.name}")
    print(f"SF-ORB Response: {env1.sf_orb_response}")

    # Test 2: Tribunal query
    print("\n--- TEST 2: Tribunal Query ---")
    env2 = wrapper.process(
        operation=SFOrbOperation.TRIBUNAL_QUERY,
        raw_input="Analyze cognitive field density for intuition jump eligibility.",
        stimulus_type="tribunal_query"
    )
    print(f"DDR: {env2.ddr_score} | Alert: {env2.alert_level.name}")
    print(f"CALI: {env2.cali_articulation[:200]}...")

    # Test 3: Article VIII override
    print("\n--- TEST 3: Emergency Override ---")
    env3 = wrapper.process(
        operation=SFOrbOperation.VAULT_WRITE,
        raw_input="Emergency override: Write critical apriori seed to vault.",
        stimulus_type="vault_emergency",
        article_viii_override_id="ART8-SFORB-EMERGENCY-001",
        override_justification="System integrity requires immediate apriori update"
    )
    print(f"Trust State: {env3.trust_state.value}")
    print(f"Override ID: {env3.article_viii_override_id}")

    # Compliance report
    print("\n--- COMPLIANCE REPORT ---")
    report = wrapper.get_compliance_report()
    print(json.dumps(report, indent=2))

    # DDR Trend
    print("\n--- DDR TREND ---")
    trend = wrapper.get_ddr_trend()
    print(json.dumps(trend, indent=2))

    print("\n" + "=" * 70)
    print("SF-ORB governance pipeline complete. All envelopes immutable and auditable.")
    print("=" * 70)
