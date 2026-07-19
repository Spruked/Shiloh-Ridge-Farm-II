#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

install -m 0644 qwen3-tts.service /etc/systemd/system/qwen3-tts.service
install -m 0644 faster-whisper.service /etc/systemd/system/faster-whisper.service
install -m 0644 ollama-preload.service /etc/systemd/system/ollama-preload.service
install -m 0644 shiloh-voice-warmup.service /etc/systemd/system/shiloh-voice-warmup.service
chmod 0755 /home/bryan/projects/shilohridgekatahdins.com/ops/wsl-systemd/warmup_voice_stack.sh
chmod 0755 /home/bryan/projects/shilohridgekatahdins.com/ops/wsl-systemd/preload_ollama.sh

mkdir -p /etc/systemd/system/ollama.service.d
cat >/etc/systemd/system/ollama.service.d/shiloh-keepalive.conf <<'EOF'
[Service]
User=bryan
Group=bryan
Environment=HOME=/home/bryan
Environment=OLLAMA_MODELS=/home/bryan/.ollama/models
Environment=OLLAMA_KEEP_ALIVE=-1
Environment=OLLAMA_NUM_PARALLEL=1
Restart=always
RestartSec=3
StartLimitIntervalSec=0
EOF

systemctl daemon-reload
systemctl enable ollama.service ollama-preload.service qwen3-tts.service faster-whisper.service shiloh-voice-warmup.service
systemctl restart ollama.service
systemctl restart qwen3-tts.service faster-whisper.service
systemctl restart ollama-preload.service shiloh-voice-warmup.service

systemctl --no-pager --full status ollama.service ollama-preload.service qwen3-tts.service faster-whisper.service shiloh-voice-warmup.service
