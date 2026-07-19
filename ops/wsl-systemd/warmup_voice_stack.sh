#!/usr/bin/env bash
set -euo pipefail

OLLAMA_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:1.5b}"
OLLAMA_FALLBACK_MODEL="${OLLAMA_FALLBACK_MODEL:-llama3.2:1b}"
QWEN_TTS_HEALTH_URL="${QWEN_TTS_HEALTH_URL:-http://127.0.0.1:9880/health}"
FAST_WHISPER_URL="${FAST_WHISPER_URL:-http://127.0.0.1:9000/stt}"

wait_for_http() {
  local url="$1"
  local name="$2"
  for _ in $(seq 1 90); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$name ready: $url"
      return 0
    fi
    sleep 1
  done
  echo "$name did not become ready: $url" >&2
  return 1
}

wait_for_http "$OLLAMA_URL/api/tags" "ollama"

curl -fsS "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$OLLAMA_MODEL\",\"prompt\":\"warmup\",\"stream\":false}" >/dev/null

curl -fsS "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$OLLAMA_FALLBACK_MODEL\",\"prompt\":\"warmup\",\"stream\":false}" >/dev/null || true

wait_for_http "$QWEN_TTS_HEALTH_URL" "qwen3-tts"

if [[ "$FAST_WHISPER_URL" == */stt ]]; then
  # The faster-whisper server loads the model at process start. A socket check is
  # enough here; sending fake audio would create noisy transcription errors.
  host_port="${FAST_WHISPER_URL#http://}"
  host_port="${host_port%%/*}"
  host="${host_port%%:*}"
  port="${host_port##*:}"
  for _ in $(seq 1 90); do
    if timeout 1 bash -lc ":</dev/tcp/$host/$port" >/dev/null 2>&1; then
      echo "faster-whisper ready: $FAST_WHISPER_URL"
      exit 0
    fi
    sleep 1
  done
  echo "faster-whisper did not become ready: $FAST_WHISPER_URL" >&2
  exit 1
fi

echo "voice stack warmup complete"
