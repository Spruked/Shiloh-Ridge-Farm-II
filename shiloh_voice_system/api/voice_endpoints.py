import base64
import asyncio
import contextlib
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import urllib.request
import wave
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urlencode

import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field


DEFAULT_QWEN_TTS_URL = "http://127.0.0.1:9880/speak"
DEFAULT_KOKORO_VOICE = "am_adam"
DEFAULT_EDGE_VOICE = "en-US-GuyNeural"
SAMPLE_RATE = 24000

app = FastAPI(title="Shiloh Ridge Voice Service")


class SynthesisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice: Optional[str] = None
    speed: float = 1.0
    rate: str = "+0%"
    pitch: str = "+0Hz"


def _qwen_url() -> str:
    return os.environ.get("SHILOH_QWEN_TTS_URL") or os.environ.get("QWEN_TTS_URL") or DEFAULT_QWEN_TTS_URL


def _kokoro_voice() -> str:
    return os.environ.get("SHILOH_KOKORO_VOICE") or os.environ.get("KOKORO_VOICE") or DEFAULT_KOKORO_VOICE


def _edge_voice() -> str:
    return os.environ.get("SHILOH_EDGE_TTS_VOICE", DEFAULT_EDGE_VOICE)


def _audio_cache_dir() -> Path:
    cache_dir = Path(os.environ.get("SHILOH_VOICE_CACHE_DIR", tempfile.gettempdir())) / "shiloh_voice"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def _cache_path(text: str, voice: str, backend: str, extension: str) -> Path:
    digest = hashlib.sha256(f"{backend}\n{voice}\n{text}".encode("utf-8")).hexdigest()[:24]
    return _audio_cache_dir() / f"{backend}_{digest}.{extension}"


def _service_url_candidates(url: str) -> list[str]:
    candidates = [url]
    try:
        resolv = Path("/etc/resolv.conf").read_text(encoding="utf-8", errors="ignore")
        host = ""
        for line in resolv.splitlines():
            parts = line.strip().split()
            if len(parts) == 2 and parts[0] == "nameserver":
                host = parts[1]
                break
        if host and host not in ("127.0.0.1", "localhost"):
            for local in ("127.0.0.1", "localhost"):
                if local in url:
                    candidates.append(url.replace(local, host, 1))
                    candidates.append(url.replace(local, "host.docker.internal", 1))
    except Exception:
        pass

    seen = set()
    return [candidate for candidate in candidates if candidate and not (candidate in seen or seen.add(candidate))]


def _write_wav(path: Path, audio: np.ndarray, sample_rate: int = SAMPLE_RATE) -> None:
    clipped = np.clip(audio, -1.0, 1.0)
    pcm = (clipped * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm.tobytes())


def _generate_with_qwen(payload: SynthesisRequest) -> Tuple[Optional[Path], Optional[str]]:
    voice = payload.voice or _kokoro_voice()
    output_path = _cache_path(payload.text, voice, "qwen", "wav")
    if output_path.exists() and output_path.stat().st_size > 0:
        return output_path, "qwen-3-tts"

    body = {
        "text": payload.text,
        "instruct": os.environ.get(
            "SHILOH_QWEN_TTS_INSTRUCT",
            "A grounded, friendly middle-aged farm voice with a clear, practical tone.",
        ),
        "output_path": str(output_path),
    }
    speak_body = {
        "text": payload.text,
        "language": "English",
        "mode": "voice_clone",
    }
    kokoro_body = {
        "text": payload.text,
        "speaker": os.environ.get("SHILOH_QWEN_TTS_SPEAKER", "butch_male"),
        "voice": voice,
        "format": "wav",
        "sample_rate": SAMPLE_RATE,
        "speed": payload.speed,
    }

    for url in _service_url_candidates(_qwen_url()):
        try:
            request = urllib.request.Request(
                url,
                data=json.dumps(
                    speak_body if url.rstrip("/").endswith("/speak")
                    else body if url.rstrip("/").endswith("/generate")
                    else kokoro_body
                ).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            timeout = float(os.environ.get("SHILOH_QWEN_TTS_TIMEOUT_SEC", "8"))
            with urllib.request.urlopen(request, timeout=timeout) as response:
                content = response.read()
                if "audio" in (response.headers.get("Content-Type") or "").lower():
                    output_path.write_bytes(content)
                    return output_path, response.headers.get("X-TTS-Engine") or "qwen-3-tts"
                data = json.loads(content.decode("utf-8", errors="replace") or "{}")

            audio_b64 = data.get("audio_wav_base64") or data.get("audio_base64")
            if audio_b64:
                output_path.write_bytes(base64.b64decode(audio_b64))
                return output_path, "qwen-3-tts"
            audio_path = data.get("audio_path") or data.get("path") or data.get("audio_file") or data.get("output_path")
            if audio_path:
                source = Path(str(audio_path))
                if source.exists():
                    output_path.write_bytes(source.read_bytes())
                    return output_path, "qwen-3-tts"
        except Exception:
            with contextlib.suppress(FileNotFoundError):
                output_path.unlink()

    return None, None


def _generate_with_kokoro_python(payload: SynthesisRequest) -> Tuple[Optional[Path], Optional[str]]:
    try:
        from kokoro import KPipeline  # type: ignore
    except Exception:
        return None, None

    voice = payload.voice or _kokoro_voice()
    output_path = _cache_path(payload.text, voice, "kokoro", "wav")
    if output_path.exists() and output_path.stat().st_size > 0:
        return output_path, "kokoro-python"

    try:
        pipeline = KPipeline(lang_code=os.environ.get("SHILOH_KOKORO_LANG_CODE", "a"))
        segments = [
            np.asarray(audio, dtype=np.float32)
            for _, _, audio in pipeline(payload.text, voice=voice, speed=payload.speed, split_pattern=r"\n+")
        ]
        if not segments:
            return None, None
        _write_wav(output_path, np.concatenate(segments))
        return output_path, "kokoro-python"
    except Exception:
        with contextlib.suppress(FileNotFoundError):
            output_path.unlink()
        return None, None


def _generate_with_kokoro_cli(payload: SynthesisRequest) -> Tuple[Optional[Path], Optional[str]]:
    cli_path = os.environ.get("KOKORO_TTS_BIN") or shutil.which("kokoro-tts")
    if not cli_path:
        return None, None

    voice = payload.voice or _kokoro_voice()
    output_path = _cache_path(payload.text, voice, "kokoro-cli", "wav")
    if output_path.exists() and output_path.stat().st_size > 0:
        return output_path, "kokoro-cli"

    input_path = _audio_cache_dir() / f"kokoro_{hashlib.sha256(payload.text.encode('utf-8')).hexdigest()[:12]}.txt"
    input_path.write_text(payload.text, encoding="utf-8")
    command = [
        cli_path,
        str(input_path),
        str(output_path),
        "--voice",
        voice,
        "--speed",
        str(payload.speed),
    ]

    try:
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=float(os.environ.get("SHILOH_KOKORO_CLI_TIMEOUT_SEC", "12")),
        )
        if result.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
            return output_path, "kokoro-cli"
    except Exception:
        pass
    finally:
        with contextlib.suppress(FileNotFoundError):
            input_path.unlink()

    with contextlib.suppress(FileNotFoundError):
        output_path.unlink()
    return None, None


async def _generate_with_edge(payload: SynthesisRequest) -> Tuple[Optional[Path], Optional[str]]:
    try:
        import edge_tts
    except Exception:
        return None, None

    voice = payload.voice or _edge_voice()
    output_path = _cache_path(payload.text, voice, "edge", "mp3")
    if output_path.exists() and output_path.stat().st_size > 0:
        return output_path, "edge-tts"

    try:
        communicate = edge_tts.Communicate(payload.text, voice=voice, rate=payload.rate, pitch=payload.pitch)
        await communicate.save(str(output_path))
        return output_path, "edge-tts"
    except Exception:
        with contextlib.suppress(FileNotFoundError):
            output_path.unlink()
        return None, None


async def _synthesize_to_file(payload: SynthesisRequest) -> Tuple[Path, str]:
    for generator in (_generate_with_qwen, _generate_with_kokoro_python, _generate_with_kokoro_cli):
        # All local/HTTP generators are blocking. Keep FastAPI's event loop free so
        # health checks and concurrent voice requests remain responsive.
        audio_path, backend = await asyncio.to_thread(generator, payload)
        if audio_path and backend:
            return audio_path, backend

    try:
        audio_path, backend = await asyncio.wait_for(
            _generate_with_edge(payload),
            timeout=float(os.environ.get("SHILOH_EDGE_TTS_TIMEOUT_SEC", "8")),
        )
    except asyncio.TimeoutError:
        audio_path, backend = None, None
    if audio_path and backend:
        return audio_path, backend

    raise HTTPException(
        status_code=503,
        detail="No voice backend is available. Tried Qwen 3 TTS, Kokoro TTS, then Edge TTS.",
    )


def _module_available(module_name: str) -> bool:
    try:
        __import__(module_name)
        return True
    except Exception:
        return False


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "priority": ["qwen-3-tts", "kokoro-tts", "edge-tts"],
        "qwen_tts_url": _qwen_url(),
        "kokoro_python_available": _module_available("kokoro"),
        "kokoro_cli_available": bool(os.environ.get("KOKORO_TTS_BIN") or shutil.which("kokoro-tts")),
        "edge_tts_available": _module_available("edge_tts"),
        "edge_is_third_fallback": True,
    }


@app.post("/synthesize")
async def synthesize(payload: SynthesisRequest):
    audio_path, backend = await _synthesize_to_file(payload)
    query = urlencode(
        {
            "text": payload.text,
            "voice": payload.voice or (_edge_voice() if backend == "edge-tts" else _kokoro_voice()),
            "speed": payload.speed,
            "rate": payload.rate,
            "pitch": payload.pitch,
        }
    )
    return {
        "audio_url": f"/speak?{query}",
        "file": audio_path.name,
        "voice_backend": backend,
        "available": True,
        "use_browser_tts": False,
    }


@app.get("/speak")
async def speak(
    text: str = Query(..., min_length=1, max_length=5000),
    voice: Optional[str] = None,
    speed: float = 1.0,
    rate: str = "+0%",
    pitch: str = "+0Hz",
):
    payload = SynthesisRequest(text=text, voice=voice, speed=speed, rate=rate, pitch=pitch)
    audio_path, backend = await _synthesize_to_file(payload)
    media_type = "audio/mpeg" if backend == "edge-tts" else "audio/wav"
    return FileResponse(audio_path, media_type=media_type, filename=audio_path.name)


@app.get("/")
async def root():
    return await health()
