# ORB Design QA

- Reference inspected: `assets/images/best_shep.png`
- Implementation: `frontend/src/components/orb/AdminCaliOrbBubble.jsx`
- Production build: passed (`craco build`)
- Source-level checks: 60% skin opacity, circular clipping, glass overlay, two outward-pulsing tan/white glow rings, full-viewport clamping, smooth 50 ms glide, cursor-aware destination choice, overlap-only nudge, and manual drag are present.
- Rendered browser comparison: blocked because no interactive browser/capture surface is available in this session.
- Automated regression suite: blocked because `.venv/bin/pytest` has a stale interpreter path and system Python does not have pytest installed.

Final result: blocked

