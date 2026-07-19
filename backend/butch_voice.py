import base64
import contextlib
import json
import os
import shlex
import shutil
import subprocess
import tempfile
import urllib.request
import uuid
import wave
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np


ROOT_DIR = Path(__file__).parent


def _windows_host_from_wsl() -> str:
    if os.name == "nt":
        return "127.0.0.1"
    try:
        resolv = Path("/etc/resolv.conf").read_text(encoding="utf-8", errors="ignore")
        for line in resolv.splitlines():
            parts = line.strip().split()
            if len(parts) == 2 and parts[0] == "nameserver":
                return parts[1]
    except Exception:
        pass
    return "127.0.0.1"


def _default_qwen_tts_url() -> str:
    return "http://127.0.0.1:9880/speak"


def _service_url_candidates(url: str) -> list[str]:
    candidates = [url]
    host = _windows_host_from_wsl()
    for local in ("127.0.0.1", "localhost"):
        if local in url and host not in ("127.0.0.1", "localhost"):
            candidates.append(url.replace(local, host, 1))
            candidates.append(url.replace(local, "host.docker.internal", 1))
    seen = set()
    return [candidate for candidate in candidates if candidate and not (candidate in seen or seen.add(candidate))]


def _local_read_path(path_value: str) -> Path:
    raw = str(path_value or "").strip()
    if os.name != "nt" and len(raw) > 2 and raw[1] == ":":
        drive = raw[0].lower()
        rest = raw[2:].replace("\\", "/").lstrip("/")
        return Path(f"/mnt/{drive}/{rest}")
    return Path(raw)


class ButchVoiceSystem:
    """
    Kokoro-backed TTS with adaptive post-processing.

    The runtime on this machine is uneven: sometimes Kokoro is importable
    directly, sometimes only the CLI is available, and sometimes the only
    usable copy is in the WSL virtualenv. This wrapper tries the available
    options in that order and degrades cleanly if none are ready.
    """

    def __init__(self):
        self.sample_rate = 24000
        self.audio_cache = ROOT_DIR / "butch_audio_cache"
        self.audio_cache.mkdir(parents=True, exist_ok=True)
        self.voice_name = os.environ.get("BUTCH_KOKORO_VOICE", "am_adam")
        self.language = os.environ.get("BUTCH_KOKORO_LANG", "en-us")
        self.default_speed = float(os.environ.get("BUTCH_KOKORO_SPEED", "1.0"))
        self.model_path = os.environ.get("KOKORO_MODEL_PATH")
        self.voices_path = os.environ.get("KOKORO_VOICES_PATH")
        self.wsl_kokoro_bin = os.environ.get("KOKORO_WSL_BIN", "~/.venv/bin/kokoro-tts")
        raw_qwen_tts_url = os.environ.get("BUTCH_QWEN_TTS_URL", os.environ.get("QWEN_TTS_URL", ""))
        if ":8000" in raw_qwen_tts_url and "/api/kokoro/tts" in raw_qwen_tts_url:
            raw_qwen_tts_url = ""
        self.qwen_tts_url = raw_qwen_tts_url or _default_qwen_tts_url()
        self.qwen_speaker = os.environ.get("BUTCH_QWEN_TTS_SPEAKER", "butch_male")
        self.qwen_tts_timeout = int(os.environ.get("BUTCH_QWEN_TTS_TIMEOUT_SEC", os.environ.get("QWEN_TTS_TIMEOUT_SEC", "220")))
        self.qwen_primary_timeout = int(os.environ.get("BUTCH_QWEN_TTS_PRIMARY_TIMEOUT_SEC", os.environ.get("QWEN_TTS_PRIMARY_TIMEOUT_SEC", "8")))
        self.kokoro_tts_timeout = int(os.environ.get("BUTCH_KOKORO_TTS_TIMEOUT_SEC", os.environ.get("KOKORO_TTS_TIMEOUT_SEC", "45")))
        self.enable_python_backend = os.environ.get("BUTCH_ENABLE_LOCAL_KOKORO", "").strip().lower() in ("1", "true", "yes", "on")
        self._python_backend = self._init_python_backend() if self.enable_python_backend else None
        self._cli_path = self._detect_local_cli()
        self._wsl_enabled = self._detect_wsl_cli()
        self.has_kokoro = bool(self._python_backend or self._cli_path or self._wsl_enabled)
        self.has_voice = bool(self.qwen_tts_url or self.has_kokoro)

    def _init_python_backend(self):
        try:
            from kokoro import KPipeline  # type: ignore

            return KPipeline(lang_code="a")
        except Exception:
            return None

    def _detect_local_cli(self) -> Optional[str]:
        candidates = [
            os.environ.get("KOKORO_TTS_BIN"),
            os.environ.get("KOKORO_PYTHON_BIN"),
            shutil.which("kokoro-tts"),
            "/home/bryan/.venv/bin/kokoro-tts",
        ]
        for candidate in candidates:
            if candidate and Path(candidate).exists():
                return candidate
        return None

    def _detect_wsl_cli(self) -> bool:
        if os.name != "nt" or shutil.which("wsl") is None:
            return False

        command = f"{shlex.quote(self.wsl_kokoro_bin)} --help >/dev/null 2>&1"
        try:
            result = subprocess.run(
                ["wsl", "bash", "-lc", command],
                check=False,
                capture_output=True,
                text=True,
                timeout=10,
            )
            return result.returncode == 0
        except Exception:
            return False

    def describe_backend(self) -> Dict[str, Any]:
        return {
            "qwen_tts_url": self.qwen_tts_url,
            "qwen_primary": bool(self.qwen_tts_url),
            "kokoro_fallback": self.has_kokoro,
            "python_backend": self._python_backend is not None,
            "local_cli": self._cli_path,
            "wsl_bridge": self._wsl_enabled,
            "voice": self.voice_name,
            "gender": "male",
            "voice_role": "butch",
            "language": self.language,
        }

    async def synthesize(self, text: str, customer_id: str, acp_settings: Dict[str, Any]) -> Dict[str, Any]:
        if not self.has_voice:
            return {
                "text": text,
                "duration": 0,
                "acp_applied": False,
                "aacp_applied": False,
                "settings_hash": hash(str(acp_settings)),
                "backend_used": None,
                "available": False,
                "use_browser_tts": False,
            }

        if not text.strip():
            return {
                "audio_url": None,
                "duration": 0,
                "acp_applied": False,
                "aacp_applied": False,
                "settings_hash": hash(str(acp_settings)),
                "backend_used": None,
                "available": False,
                "use_browser_tts": False,
            }

        try:
            audio_path, backend_used = self._generate_audio(text, acp_settings)
            if not audio_path:
                return {
                    "audio_url": None,
                    "duration": 0,
                    "acp_applied": False,
                    "aacp_applied": False,
                    "settings_hash": hash(str(acp_settings)),
                    "backend_used": None,
                    "available": False,
                    "use_browser_tts": False,
                }

            processed_audio, sample_rate = self._load_and_process(audio_path, acp_settings)
            filename = f"butch_{customer_id}_{abs(hash((text, backend_used))) % 100000}.wav"
            output_path = self.audio_cache / filename
            self._write_wav(output_path, processed_audio, sample_rate)

            return {
                "audio_url": f"/butch_audio/{filename}",
                "duration": round(len(processed_audio) / sample_rate, 2),
                "acp_applied": True,
                "aacp_applied": True,
                "settings_hash": hash(str(acp_settings)),
                "backend_used": backend_used,
                "available": True,
                "use_browser_tts": False,
            }
        except Exception as error:
            return {
                "audio_url": None,
                "duration": 0,
                "acp_applied": False,
                "aacp_applied": False,
                "settings_hash": hash(str(acp_settings)),
                "backend_used": None,
                "available": False,
                "use_browser_tts": False,
                "error": str(error),
            }

    def _generate_audio(self, text: str, acp_settings: Dict[str, Any]) -> Tuple[Optional[Path], Optional[str]]:
        qwen_audio = self._generate_with_qwen_bridge(text, acp_settings)
        if qwen_audio:
            return qwen_audio, "qwen-tts"

        if self._python_backend is not None:
            audio_path = self._generate_with_python(text, acp_settings)
            if audio_path:
                return audio_path, "python"

        if self._cli_path:
            audio_path = self._generate_with_cli(text, acp_settings, self._cli_path)
            if audio_path:
                return audio_path, "cli"

        if self._wsl_enabled:
            audio_path = self._generate_with_wsl_cli(text, acp_settings)
            if audio_path:
                return audio_path, "wsl-cli"

        return None, None

    def _generate_with_qwen_bridge(self, text: str, acp_settings: Dict[str, Any]) -> Optional[Path]:
        if not self.qwen_tts_url:
            return None
        output_path = self._make_temp_path(".wav")
        qwen_instruct = (
            "A grounded, friendly middle-aged butcher voice "
            "with a clear, practical, conversational tone."
        )
        payload = {
            "text": text,
            "instruct": qwen_instruct,
            "output_path": f"/tmp/shiloh_butch_{uuid.uuid4().hex}.wav",
        }
        kokoro_payload = {
            "text": text,
            "speaker": self.qwen_speaker,
            "voice": self.voice_name,
            "format": "wav",
            "sample_rate": self.sample_rate,
            "speed": acp_settings.get("voice_speed", self.default_speed),
        }
        try:
            data = None
            for url in _service_url_candidates(self.qwen_tts_url):
                try:
                    request_payload = payload if url.rstrip("/").endswith("/generate") else kokoro_payload
                    request = urllib.request.Request(
                        url,
                        data=json.dumps(request_payload).encode("utf-8"),
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    timeout = self.qwen_primary_timeout if url.rstrip("/").endswith("/generate") else self.kokoro_tts_timeout
                    with urllib.request.urlopen(request, timeout=timeout) as response:
                        data = json.loads(response.read().decode("utf-8", errors="replace") or "{}")
                    break
                except Exception:
                    data = None
            if data is None:
                raise RuntimeError("Qwen TTS bridge unavailable")

            audio_b64 = data.get("audio_wav_base64") or data.get("audio_base64")
            if audio_b64:
                output_path.write_bytes(base64.b64decode(audio_b64))
                return output_path

            audio_path = (
                data.get("audio_path")
                or data.get("path")
                or data.get("audio_file")
                or data.get("output_path")
            )
            if audio_path:
                source = _local_read_path(str(audio_path))
                if source.exists():
                    output_path.write_bytes(source.read_bytes())
                    return output_path
        except Exception:
            with contextlib.suppress(FileNotFoundError):
                output_path.unlink()
            return None
        return None

    def _generate_with_python(self, text: str, acp_settings: Dict[str, Any]) -> Optional[Path]:
        if self._python_backend is None:
            return None

        output_path = self._make_temp_path(".wav")
        try:
            generator = self._python_backend(
                text,
                voice=self.voice_name,
                speed=acp_settings.get("voice_speed", self.default_speed),
                split_pattern=r"\n+",
            )
            audio_segments = []
            for _, _, audio in generator:
                audio_segments.append(np.array(audio, dtype=np.float32))
            if not audio_segments:
                return None

            combined = np.concatenate(audio_segments)
            self._write_wav(output_path, combined, self.sample_rate)
            return output_path
        except Exception:
            with contextlib.suppress(FileNotFoundError):
                output_path.unlink()
            return None

    def _generate_with_cli(self, text: str, acp_settings: Dict[str, Any], cli_path: str) -> Optional[Path]:
        output_path = self._make_temp_path(".wav")
        input_path = self._make_temp_path(".txt")
        input_path.write_text(text, encoding="utf-8")

        command = [
            cli_path,
            str(input_path),
            str(output_path),
            "--voice",
            self.voice_name,
            "--lang",
            self.language,
            "--speed",
            str(acp_settings.get("voice_speed", self.default_speed)),
        ]
        if self.model_path:
            command.extend(["--model", self.model_path])
        if self.voices_path:
            command.extend(["--voices", self.voices_path])

        try:
            result = subprocess.run(command, check=False, capture_output=True, text=True, timeout=120)
            if result.returncode == 0 and output_path.exists():
                return output_path
            return None
        finally:
            with contextlib.suppress(FileNotFoundError):
                input_path.unlink()

    def _generate_with_wsl_cli(self, text: str, acp_settings: Dict[str, Any]) -> Optional[Path]:
        output_path = self._make_temp_path(".wav")
        input_path = self._make_temp_path(".txt")
        input_path.write_text(text, encoding="utf-8")

        try:
            input_wsl = self._windows_to_wsl(input_path)
            output_wsl = self._windows_to_wsl(output_path)
            cli_path = shlex.quote(self.wsl_kokoro_bin)
            command = (
                f"{cli_path} {shlex.quote(input_wsl)} {shlex.quote(output_wsl)} "
                f"--voice {shlex.quote(self.voice_name)} "
                f"--lang {shlex.quote(self.language)} "
                f"--speed {shlex.quote(str(acp_settings.get('voice_speed', self.default_speed)))}"
            )
            if self.model_path:
                command += f" --model {shlex.quote(self._windows_to_wsl(Path(self.model_path)) if Path(self.model_path).exists() else self.model_path)}"
            if self.voices_path:
                command += f" --voices {shlex.quote(self._windows_to_wsl(Path(self.voices_path)) if Path(self.voices_path).exists() else self.voices_path)}"

            result = subprocess.run(
                ["wsl", "bash", "-lc", command],
                check=False,
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode == 0 and output_path.exists():
                return output_path
            return None
        finally:
            with contextlib.suppress(FileNotFoundError):
                input_path.unlink()

    def _windows_to_wsl(self, path: Path) -> str:
        result = subprocess.run(
            ["wsl", "wslpath", "-a", str(path)],
            check=True,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.stdout.strip()

    def _make_temp_path(self, suffix: str) -> Path:
        fd, path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        return Path(path)

    def _load_and_process(self, audio_path: Path, settings: Dict[str, Any]) -> Tuple[np.ndarray, int]:
        with wave.open(str(audio_path), "rb") as wav_file:
            frame_rate = wav_file.getframerate()
            sample_width = wav_file.getsampwidth()
            channels = wav_file.getnchannels()
            frames = wav_file.readframes(wav_file.getnframes())

        if sample_width != 2:
            raise ValueError("Only 16-bit PCM wav files are supported for Butch voice processing")

        audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32767.0
        if channels > 1:
            audio = audio.reshape(-1, channels).mean(axis=1)

        processed = self._apply_acp(audio, frame_rate, settings)

        with contextlib.suppress(FileNotFoundError):
            audio_path.unlink()

        return processed, frame_rate

    def _apply_acp(self, audio: np.ndarray, sample_rate: int, settings: Dict[str, Any]) -> np.ndarray:
        fft = np.fft.rfft(audio)
        freqs = np.fft.rfftfreq(len(audio), 1 / sample_rate)

        freq_response = settings.get("frequency_response", {})
        low_boost = freq_response.get("low_boost", 1.0)
        mid_presence = freq_response.get("mid_presence", 1.0)
        high_clarity = freq_response.get("high_clarity", 1.0)

        fft[freqs < 250] *= low_boost
        fft[(freqs >= 1000) & (freqs <= 4000)] *= mid_presence
        fft[freqs > 4000] *= high_clarity

        compression = settings.get("dynamic_range", {}).get("compression", 0.3)
        if compression > 0:
            magnitude = np.abs(fft)
            compressed = np.power(np.maximum(magnitude, 1e-8), 1 - compression)
            fft = fft * (compressed / (magnitude + 1e-8))

        processed = np.fft.irfft(fft, n=len(audio))
        processed = np.tanh(processed * 1.2) / 1.2
        return processed.astype(np.float32)

    def _apply_aacp(self, audio: np.ndarray, sample_rate: int, settings: Dict[str, Any]) -> np.ndarray:
        """Backward-compatible alias for the old typo."""
        return self._apply_acp(audio, sample_rate, settings)

    def _write_wav(self, output_path: Path, audio: np.ndarray, sample_rate: int):
        normalized = np.clip(audio, -1.0, 1.0)
        pcm = (normalized * 32767).astype(np.int16)
        with wave.open(str(output_path), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm.tobytes())


butch_voice = ButchVoiceSystem()
