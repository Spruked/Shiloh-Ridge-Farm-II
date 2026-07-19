"""Compatibility module for the canonical SF-ORB governance wrapper.

The implementation lives in sf_orb_Governance.py. This lower-case module keeps
the documented import and compile contract stable:

    from sf_orb_governance_wrapper import SFOrbGovernanceWrapper
"""

from sf_orb_Governance import (  # noqa: F401
    AlertLevel,
    CognitiveMode,
    CognitiveState,
    SFOrbDecisionEnvelope,
    SFOrbGovernanceWrapper,
    SFOrbOperation,
    TrustState,
)
