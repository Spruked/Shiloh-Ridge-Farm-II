# Development Log

## 2026-07-12 — Shep grounded substrate integration

- Confirmed `/mnt/r` as the Windows substrate and `/mnt/r/orb_mesh` as an append-only/checkpoint mesh.
- Inspected Orb Weaver crawl, preflight, website context, claims, reports, recommendations, CRM/mail context, history, and SQLite index.
- Compiled crawl 16 into a 48-record public pointer map; excluded admin and MCP-gated records.
- Added dynamic `DIRECT`, `RETRIEVAL`, `TOOL`, `OCR`, and `ESCALATE` selection.
- Restored canonical doctrine/Renova preflight in the normal governed chat builder.
- Added inventory, extraction, search, pointers, OCR cache, escalations, mesh envelopes, FastAPI routes, and stdio MCP tools.
- Added authenticated source preview and Human Review UI.
- Created `.venv-backend`; new substrate tests pass. Existing baseline: 23 passed, one unrelated WSL TTS-candidate failure.
- `/mnt/data/content.pdf` was unavailable and no KHSI PDF was found in obvious R-drive registry/substrate locations.
- Re-enabled frontend and backend admin authentication defaults; added a safe interactive bcrypt admin upsert utility. Mongo customer accounts/profiles/orders remain persisted and customer endpoints are scoped by customer ID/email.
- Added role-separated guidance: crawl-backed public pointers for visitors and authenticated route/selector guidance for the unscanned admin section.
- First bounded R-drive inventory is intentionally partial: 2,001 files discovered, 1,817 indexed, 183 unsupported, 27 duplicates, and no read/extraction failures. OCR was not required during this pass.
- Restored WSL bridge URL candidates by default, resolving the existing TTS regression while retaining an environment switch to disable them.
- Kept GPU voice/STT packages out of the web backend image; Qwen/Kokoro/Whisper remain external services per `VOICE_RUNTIME_NOTES.md`.
- Live diagnosis found faster-whisper healthy on CUDA but Qwen output pointed at obsolete `/generate`; corrected it to `/speak` and promoted Shep from qwen2.5:1.5b to the installed qwen2.5:3b model.
- Fixed browser hearing: MediaRecorder previously had no normal stop condition, so audio was never submitted. It now auto-stops after eight seconds and supports click-again-to-finish.
- Added an intentional cloned-voice latency pack: grounded/source/answer/voice phases plus small purposeful ORB movement while Qwen generates. Browser speech fallback is disabled; the GPU-cloned voice remains authoritative.
- Removed the duplicate lower-corner Butch from Products; the orange-block butcher remains. Disabled Butch browser-voice fallback so only his distinct server voice is used.

### Next build

- Index approved butcher references and crawl/substrate evidence into Butch's existing SKG retrieval path.
- Add governed Butch→Shep return handoff with conversation, customer, product, evidence, and unresolved-question context; preserve the existing Shep→Butch event.
- Reduced response latency by making cloned server TTS non-blocking/off in the web reply path (services remain warm), using immediate browser speech, hiding idle bubbles after 900 ms, increasing ORB opacity, and doubling glide responsiveness at 32 ms updates.
# 2026-07-12 — Butch product-page grounding and ORB handoff

- Kept only the orange-block Products-page Butch; the duplicate floating Butch remains disabled there.
- Grounded the live `/butcher/parse` path in `assets/butch_product_knowledge.csv` and `crawl_16.json`, with source hashes and evidence pointers.
- Added privacy-filtered, append-only Butch learning and Butch-to-Shep handoff envelopes under `/mnt/r/orb_mesh/results/web`.
- Added a “Hand off to Shep” control that transfers the question, Butch response, and evidence without making the visitor repeat context.
- Disabled browser TTS fallback throughout Butch's backend; Qwen/Kokoro server voice is the only voice output path.
- Corrected the deployed substrate-derived path and avoided full 84 MB index searches on ordinary chat requests (live response validation: ~0.05 seconds).
- Validation: production frontend compiled, substrate tests `4 passed`, backend/front end healthy on ports `12000` and `3100`.

# 2026-07-12 — Shep presentation and voice correction

- Reviewed screenshots `191022`, `191033`, and `191044`; confirmed excessive page traversal, washed-out skin, and visitor-facing internal latency phases.
- Removed all internal grounding, substrate-checking, response-preparation, and voice-shaping text from the visitor bubble.
- Reduced autonomous speed and travel range; Shep now uses small local glides instead of crossing the page.
- Added a consistent speaking perch: Shep glides toward it while waiting and freezes immediately when speech begins.
- Increased dog-image contrast/opacity and reduced bright screen-blend overlays while retaining the glass shell and pulsing rings.
- Cleared a stale Qwen TTS busy lock by restarting its supervised worker; verified a real WAV response after the model reloaded on the RTX 3050.
- Rebuilt and reloaded the frontend container on port `3100`.
- Replaced the ORB skin with `shep better1024.png` at true 1.0 opacity, removed whole-ORB fading, and reduced the glass wash over Shep's face while preserving the outer pulse rings.
- Added “The Story of Shep” to the About page, with `best_shep.png` beside wrapped text honoring the beloved flock dog who inspired the website ORB.
- Removed Shep's remaining glass overlays, tightened both pulse-ring origins to 1 px, and corrected the entrance animation so it ends at full opacity rather than 0.62.
- Restored unrestricted full-viewport roaming, added a 2.2-second splash entrance, and synchronized pointer guidance on the Shiloh Ridge Farm navigation brand with Shep's spoken visitor greeting.
- Corrected the local frontend backend fallback to port `12000`; a direct build without the Compose argument had temporarily caused the blank tan ORB and would have broken chat/voice requests.
- Repaired visitor microphone capture with echo cancellation, noise suppression, recorder-format fallbacks, visible permission errors, and automatic suspension of Shep's own audio while listening; live CUDA Whisper transcription passed.
- Fixed the site-chat LLM-timeout fallback calling a nonexistent speech function, added bounded Qwen busy retries, and added a browser-autoplay unlock so the first Shep click plays a blocked greeting at full volume before later clicks begin microphone capture.
- Replaced the runtime-generated visitor welcome with a locally served 2.64-second cached Shep WAV, made voice input/output permanently enabled, routed browser audio permission through the site splash/first general interaction rather than an ORB click, and made Shep automatically listen after the greeting and after each spoken answer.
