# Voice Runtime Notes

- Qwen3-TTS and Kokoro TTS/STT support services must run under Python 3.12.
- Do not install or run the voice stack from the main Python 3.14 site backend venv.
- The current Qwen3-TTS service entrypoint is `/home/bryan/qwen3_tts_06b/server_06b.py`.
- The site backend should call Qwen3-TTS at `http://127.0.0.1:9880/speak`.
- Current Qwen model is `Qwen/Qwen3-TTS-12Hz-0.6B-Base`; it loads successfully but requires `voice_clone_prompt` or `ref_audio` to generate speech.
- The current faster-whisper STT service entrypoint is `/home/bryan/faster_whisper_server/server.py`.
- The site backend should call faster-whisper at `http://127.0.0.1:9000/stt`.
- Backend TTS is bounded by `SHEP_TTS_TOTAL_TIMEOUT_SEC` (default `8`) so a slow or misconfigured TTS engine cannot stall Shep chat.
- `SHEP_ENABLE_SERVER_TTS` defaults to enabled. The frontend falls back to browser speech synthesis if the server returns text without audio.
- `shiloh_voice_system` consumes raw WAV responses from Qwen's `/speak` endpoint, caches generated audio, and runs blocking generators in worker threads so its FastAPI event loop stays responsive.
- Standalone voice latency limits default to 8 seconds for Qwen, 12 seconds for the Kokoro CLI, and 8 seconds for Edge TTS. Override them with `SHILOH_QWEN_TTS_TIMEOUT_SEC`, `SHILOH_KOKORO_CLI_TIMEOUT_SEC`, and `SHILOH_EDGE_TTS_TIMEOUT_SEC`.
- WSL systemd unit files live in `ops/wsl-systemd/`.
- Install or refresh the reboot services with `sudo ops/wsl-systemd/install_voice_services.sh`.
- Ollama is kept warm with `OLLAMA_KEEP_ALIVE=-1` and `ollama-preload.service`.
- `shiloh-voice-warmup.service` waits for Ollama, Qwen3-TTS, and faster-whisper after reboot.
