#!/usr/bin/env bash
set -euo pipefail

OLLAMA_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:1.5b}"
OLLAMA_FALLBACK_MODEL="${OLLAMA_FALLBACK_MODEL:-llama3.2:1b}"

for _ in $(seq 1 90); do
  if curl -fsS "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$OLLAMA_MODEL\",\"prompt\":\"warmup\",\"stream\":false}" >/dev/null

curl -fsS "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$OLLAMA_FALLBACK_MODEL\",\"prompt\":\"warmup\",\"stream\":false}" >/dev/null || true

echo "ollama models preloaded"
