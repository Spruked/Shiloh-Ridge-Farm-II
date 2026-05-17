import asyncio
import base64
import contextlib
import io
import os
import tempfile
import time
import wave
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

try:
    import torch
except Exception:
    torch = None

try:
    import whisper
except Exception:
    whisper = None

try:
    import onnx
except Exception:
    onnx = None

try:
    import onnxruntime as ort
except Exception:
    ort = None

try:
    from kokoro import KPipeline
except Exception:
    KPipeline = None


router = APIRouter(tags=["gpu"])

_CACHE_DIR = Path("/tmp/gpu_inference")
_CACHE_DIR.mkdir(parents=True, exist_ok=True)
_ONNX_MODEL_PATH = _CACHE_DIR / "relu_identity.onnx"

_state: Dict[str, Any] = {
    "warmup_completed": False,
    "warmup_error": None,
    "warmup_duration_sec": None,
    "whisper_models": {},
    "kokoro_pipeline": None,
    "onnx_sessions": {},
    "last_health": {},
}

_lock = asyncio.Lock()


class KokoroTTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=600)
    voice: str = Field(default="af_bella")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


class OnnxRunRequest(BaseModel):
    rows: int = Field(default=512, ge=16, le=4096)
    cols: int = Field(default=512, ge=16, le=4096)
    iterations: int = Field(default=10, ge=1, le=200)
    provider_preference: str = Field(default="CUDAExecutionProvider")


class TensorRTBenchmarkRequest(BaseModel):
    rows: int = Field(default=512, ge=16, le=4096)
    cols: int = Field(default=512, ge=16, le=4096)
    iterations: int = Field(default=30, ge=3, le=500)


class WhisperKokoroBenchmarkRequest(BaseModel):
    whisper_model: str = Field(default="tiny")
    whisper_iterations: int = Field(default=3, ge=1, le=20)
    kokoro_iterations: int = Field(default=5, ge=1, le=30)
    kokoro_text: str = Field(default="GPU benchmark warm speech path.", min_length=4, max_length=300)


def _require_torch() -> Any:
    if torch is None:
        raise HTTPException(status_code=500, detail="torch is not installed")
    return torch


def _require_onnxruntime() -> Any:
    if ort is None:
        raise HTTPException(status_code=500, detail="onnxruntime is not installed")
    return ort


def _cuda_ok() -> bool:
    if torch is None:
        return False
    return bool(torch.cuda.is_available() and torch.cuda.device_count() > 0)


def _torch_kernel_probe(size: int = 256) -> Dict[str, Any]:
    t = _require_torch()
    if not _cuda_ok():
        return {"ok": False, "reason": "CUDA not available"}

    a = t.randn((size, size), device="cuda")
    b = t.randn((size, size), device="cuda")
    t.cuda.synchronize()
    started = time.perf_counter()
    c = a @ b
    t.cuda.synchronize()
    elapsed = time.perf_counter() - started
    return {
        "ok": True,
        "elapsed_sec": round(elapsed, 6),
        "mean": float(c.mean().item()),
        "device": t.cuda.get_device_name(0),
        "allocated_mb": round(t.cuda.memory_allocated() / (1024 * 1024), 2),
        "reserved_mb": round(t.cuda.memory_reserved() / (1024 * 1024), 2),
    }


def _ensure_whisper_model(model_name: str = "tiny", force_reload: bool = False):
    if whisper is None:
        raise HTTPException(status_code=500, detail="openai-whisper is not installed")

    cache_key = model_name
    if force_reload:
        _state["whisper_models"].pop(cache_key, None)

    model = _state["whisper_models"].get(cache_key)
    if model is None:
        device = "cuda" if _cuda_ok() else "cpu"
        model = whisper.load_model(model_name, device=device)
        _state["whisper_models"][cache_key] = model
    return model


def _ensure_kokoro_pipeline(force_reload: bool = False):
    if KPipeline is None:
        raise HTTPException(status_code=500, detail="kokoro is not installed")

    if force_reload:
        _state["kokoro_pipeline"] = None

    if _state["kokoro_pipeline"] is None:
        _state["kokoro_pipeline"] = KPipeline(lang_code="a")
    return _state["kokoro_pipeline"]


def _build_onnx_model_if_missing() -> Path:
    if _ONNX_MODEL_PATH.exists():
        return _ONNX_MODEL_PATH

    if onnx is None:
        raise HTTPException(status_code=500, detail="onnx is not installed")

    x = onnx.helper.make_tensor_value_info("X", onnx.TensorProto.FLOAT, [None, None])
    y = onnx.helper.make_tensor_value_info("Y", onnx.TensorProto.FLOAT, [None, None])
    node = onnx.helper.make_node("Relu", ["X"], ["Y"])
    graph = onnx.helper.make_graph([node], "relu_identity_graph", [x], [y])
    model = onnx.helper.make_model(
        graph,
        opset_imports=[onnx.helper.make_operatorsetid("", 13)],
        producer_name="gpu_inference_router",
    )
    model.ir_version = 9
    onnx.save(model, str(_ONNX_MODEL_PATH))
    return _ONNX_MODEL_PATH


def _onnx_providers(preferred: str = "CUDAExecutionProvider"):
    runtime = _require_onnxruntime()
    available = runtime.get_available_providers()

    providers = []
    if preferred == "TensorrtExecutionProvider":
        if "TensorrtExecutionProvider" in available:
            providers.append((
                "TensorrtExecutionProvider",
                {
                    "trt_engine_cache_enable": True,
                    "trt_engine_cache_path": str(_CACHE_DIR / "trt_cache"),
                },
            ))
    if "CUDAExecutionProvider" in available:
        providers.append("CUDAExecutionProvider")
    providers.append("CPUExecutionProvider")
    return providers


def _ensure_onnx_session(preferred: str = "CUDAExecutionProvider"):
    runtime = _require_onnxruntime()
    cache_key = preferred
    session = _state["onnx_sessions"].get(cache_key)
    if session is not None:
        return session

    model_path = _build_onnx_model_if_missing()
    sess_options = runtime.SessionOptions()
    sess_options.enable_mem_pattern = True
    sess_options.graph_optimization_level = runtime.GraphOptimizationLevel.ORT_ENABLE_ALL
    session = runtime.InferenceSession(str(model_path), sess_options=sess_options, providers=_onnx_providers(preferred))
    _state["onnx_sessions"][cache_key] = session
    return session


def _wav_bytes_from_numpy(audio: np.ndarray, sample_rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    pcm = (np.clip(audio, -1.0, 1.0) * 32767.0).astype(np.int16)
    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm.tobytes())
    return buf.getvalue()


def _generate_test_wav(seconds: float = 1.2, sample_rate: int = 16000) -> str:
    t = np.linspace(0, seconds, int(sample_rate * seconds), endpoint=False)
    audio = 0.2 * np.sin(2 * np.pi * 220.0 * t).astype(np.float32)
    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    with wave.open(path, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes((audio * 32767).astype(np.int16).tobytes())
    return path


async def warmup_gpu_stack() -> Dict[str, Any]:
    if os.environ.get("GPU_WARMUP", "true").lower() not in {"1", "true", "yes", "on"}:
        _state["warmup_completed"] = False
        _state["warmup_error"] = "GPU_WARMUP disabled"
        return {"warmup_enabled": False}

    async with _lock:
        started = time.perf_counter()
        try:
            probe = _torch_kernel_probe(512)
            _ensure_onnx_session("CUDAExecutionProvider")
            _ensure_kokoro_pipeline()
            _ensure_whisper_model("tiny")
            _state["warmup_completed"] = True
            _state["warmup_error"] = None
            _state["warmup_duration_sec"] = round(time.perf_counter() - started, 3)
            _state["last_health"] = {
                "torch_probe": probe,
                "warmup_duration_sec": _state["warmup_duration_sec"],
            }
            return {
                "warmup_completed": True,
                "warmup_duration_sec": _state["warmup_duration_sec"],
                "torch_probe": probe,
            }
        except Exception as exc:
            _state["warmup_completed"] = False
            _state["warmup_error"] = str(exc)
            _state["warmup_duration_sec"] = round(time.perf_counter() - started, 3)
            return {
                "warmup_completed": False,
                "warmup_duration_sec": _state["warmup_duration_sec"],
                "error": str(exc),
            }


def gpu_health_snapshot() -> Dict[str, Any]:
    runtime = _require_onnxruntime()
    torch_probe = _torch_kernel_probe(128)
    providers = runtime.get_available_providers()

    checks = {
        "cuda_available": _cuda_ok(),
        "torch_kernel": torch_probe.get("ok", False),
        "onnx_cuda_provider": "CUDAExecutionProvider" in providers,
        "tensorrt_provider": "TensorrtExecutionProvider" in providers,
        "whisper_installed": whisper is not None,
        "kokoro_installed": KPipeline is not None,
        "warmup_completed": _state["warmup_completed"],
    }
    healthy = all([
        checks["cuda_available"],
        checks["torch_kernel"],
        checks["onnx_cuda_provider"],
    ])
    return {
        "healthy": healthy,
        "checks": checks,
        "torch_probe": torch_probe,
        "providers": providers,
        "warmup_error": _state["warmup_error"],
        "warmup_duration_sec": _state["warmup_duration_sec"],
    }


@router.get("/health/gpu")
async def health_gpu():
    health = gpu_health_snapshot()
    if not health["healthy"]:
        raise HTTPException(status_code=503, detail=health)
    return health


@router.post("/whisper/transcribe")
async def whisper_transcribe(
    file: UploadFile = File(...),
    model_name: str = Form(default="tiny"),
    language: Optional[str] = Form(default=None),
):
    model = _ensure_whisper_model(model_name)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    try:
        with open(path, "wb") as fh:
            fh.write(data)

        started = time.perf_counter()
        result = model.transcribe(
            path,
            language=language,
            fp16=_cuda_ok(),
            task="transcribe",
            verbose=False,
        )
        elapsed = time.perf_counter() - started
        return {
            "model": model_name,
            "device": str(next(model.parameters()).device),
            "latency_sec": round(elapsed, 4),
            "text": result.get("text", "").strip(),
            "segments": len(result.get("segments", [])),
        }
    finally:
        with contextlib.suppress(Exception):
            os.remove(path)


@router.post("/kokoro/tts")
async def kokoro_tts(payload: KokoroTTSRequest):
    pipeline = _ensure_kokoro_pipeline()
    started = time.perf_counter()
    segments = []
    for _, _, audio in pipeline(payload.text, voice=payload.voice, speed=payload.speed, split_pattern=r"\n+"):
        segments.append(np.asarray(audio, dtype=np.float32))

    if not segments:
        raise HTTPException(status_code=500, detail="Kokoro produced no audio")

    combined = np.concatenate(segments)
    wav_bytes = _wav_bytes_from_numpy(combined, sample_rate=24000)
    encoded = base64.b64encode(wav_bytes).decode("utf-8")
    elapsed = time.perf_counter() - started

    return {
        "voice": payload.voice,
        "sample_rate": 24000,
        "duration_sec": round(len(combined) / 24000, 3),
        "latency_sec": round(elapsed, 4),
        "audio_wav_base64": encoded,
    }


@router.post("/onnx/run")
async def onnx_run(payload: OnnxRunRequest):
    session = _ensure_onnx_session(payload.provider_preference)
    input_name = session.get_inputs()[0].name
    data = np.random.randn(payload.rows, payload.cols).astype(np.float32)

    latencies = []
    outputs = None
    for _ in range(payload.iterations):
        start = time.perf_counter()
        outputs = session.run(None, {input_name: data})
        latencies.append(time.perf_counter() - start)

    output = outputs[0] if outputs else data
    return {
        "provider_preference": payload.provider_preference,
        "providers": session.get_providers(),
        "iterations": payload.iterations,
        "shape": [payload.rows, payload.cols],
        "avg_latency_ms": round((sum(latencies) / len(latencies)) * 1000, 3),
        "p95_latency_ms": round(np.percentile(latencies, 95) * 1000, 3),
        "output_mean": float(output.mean()),
    }


@router.post("/tensorRT/benchmark")
async def tensorrt_benchmark(payload: TensorRTBenchmarkRequest):
    session = _ensure_onnx_session("TensorrtExecutionProvider")
    input_name = session.get_inputs()[0].name
    data = np.random.randn(payload.rows, payload.cols).astype(np.float32)

    session.run(None, {input_name: data})

    latencies = []
    for _ in range(payload.iterations):
        start = time.perf_counter()
        session.run(None, {input_name: data})
        latencies.append(time.perf_counter() - start)

    return {
        "providers": session.get_providers(),
        "iterations": payload.iterations,
        "shape": [payload.rows, payload.cols],
        "avg_latency_ms": round((sum(latencies) / len(latencies)) * 1000, 3),
        "p95_latency_ms": round(np.percentile(latencies, 95) * 1000, 3),
        "throughput_ops_per_sec": round(payload.iterations / sum(latencies), 3),
    }


@router.post("/benchmark/whisper-kokoro")
async def benchmark_whisper_kokoro(payload: WhisperKokoroBenchmarkRequest):
    t = _require_torch()
    if _cuda_ok():
        t.cuda.empty_cache()
        t.cuda.reset_peak_memory_stats()

    test_wav = _generate_test_wav()
    try:
        ws = time.perf_counter()
        cold_model = _ensure_whisper_model(payload.whisper_model, force_reload=True)
        cold_out = cold_model.transcribe(test_wav, fp16=_cuda_ok(), verbose=False)
        whisper_cold = time.perf_counter() - ws

        warm_model = _ensure_whisper_model(payload.whisper_model)
        ws2 = time.perf_counter()
        warm_model.transcribe(test_wav, fp16=_cuda_ok(), verbose=False)
        whisper_warm = time.perf_counter() - ws2

        runs = []
        for _ in range(payload.whisper_iterations):
            s = time.perf_counter()
            warm_model.transcribe(test_wav, fp16=_cuda_ok(), verbose=False)
            runs.append(time.perf_counter() - s)

        ks = time.perf_counter()
        cold_pipe = _ensure_kokoro_pipeline(force_reload=True)
        segs = [np.asarray(a, dtype=np.float32) for _, _, a in cold_pipe(payload.kokoro_text, voice="af_bella", speed=1.0)]
        if not segs:
            raise HTTPException(status_code=500, detail="Kokoro cold run produced no audio")
        kokoro_cold = time.perf_counter() - ks

        warm_pipe = _ensure_kokoro_pipeline()
        ks2 = time.perf_counter()
        _ = [a for _, _, a in warm_pipe(payload.kokoro_text, voice="af_bella", speed=1.0)]
        kokoro_warm = time.perf_counter() - ks2

        kokoro_runs = []
        for _ in range(payload.kokoro_iterations):
            s = time.perf_counter()
            _ = [a for _, _, a in warm_pipe(payload.kokoro_text, voice="af_bella", speed=1.0)]
            kokoro_runs.append(time.perf_counter() - s)

        mem = {
            "allocated_mb": round(t.cuda.memory_allocated() / (1024 * 1024), 2) if _cuda_ok() else 0.0,
            "reserved_mb": round(t.cuda.memory_reserved() / (1024 * 1024), 2) if _cuda_ok() else 0.0,
            "peak_allocated_mb": round(t.cuda.max_memory_allocated() / (1024 * 1024), 2) if _cuda_ok() else 0.0,
        }

        return {
            "whisper": {
                "model": payload.whisper_model,
                "cold_start_sec": round(whisper_cold, 4),
                "warm_start_sec": round(whisper_warm, 4),
                "sustained_avg_sec": round(float(np.mean(runs)), 4),
                "sustained_p95_sec": round(float(np.percentile(runs, 95)), 4),
                "throughput_req_per_sec": round(len(runs) / float(np.sum(runs)), 3),
                "sample_text": cold_out.get("text", "").strip()[:120],
            },
            "kokoro": {
                "cold_start_sec": round(kokoro_cold, 4),
                "warm_start_sec": round(kokoro_warm, 4),
                "sustained_avg_sec": round(float(np.mean(kokoro_runs)), 4),
                "sustained_p95_sec": round(float(np.percentile(kokoro_runs, 95)), 4),
                "throughput_req_per_sec": round(len(kokoro_runs) / float(np.sum(kokoro_runs)), 3),
            },
            "gpu_memory_residency": mem,
        }
    finally:
        with contextlib.suppress(Exception):
            os.remove(test_wav)
