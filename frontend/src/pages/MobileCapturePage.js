import { useEffect, useRef, useState } from "react";
import { Camera, Check, Mic, RefreshCw, Upload, WifiOff } from "lucide-react";
import { getBackendBaseUrl } from "../lib/backend";

const CAPTURE_DB_NAME = "shiloh-mobile-capture";
const CAPTURE_DB_VERSION = 1;
const PENDING_STORE = "pending_uploads";
const DAILY_COUNT_KEY = "shiloh-mobile-capture-daily";

function openCaptureDb() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(CAPTURE_DB_NAME, CAPTURE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PENDING_STORE)) {
        database.createObjectStore(PENDING_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPendingCaptures() {
  const database = await openCaptureDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PENDING_STORE, "readonly");
    const store = transaction.objectStore(PENDING_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function savePendingCapture(record) {
  const database = await openCaptureDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PENDING_STORE, "readwrite");
    transaction.objectStore(PENDING_STORE).put(record);
    transaction.oncomplete = () => resolve(record);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deletePendingCapture(id) {
  const database = await openCaptureDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PENDING_STORE, "readwrite");
    transaction.objectStore(PENDING_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getPendingCaptureCount() {
  const records = await getPendingCaptures();
  return records.length;
}

async function getTodayCaptureCount() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const raw = window.localStorage.getItem(DAILY_COUNT_KEY);
  if (!raw) {
    return 0;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey) {
      return 0;
    }
    return Number(parsed.count) || 0;
  } catch (error) {
    return 0;
  }
}

function incrementTodayCaptureCount() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const raw = window.localStorage.getItem(DAILY_COUNT_KEY);

  if (!raw) {
    window.localStorage.setItem(DAILY_COUNT_KEY, JSON.stringify({ date: todayKey, count: 1 }));
    return 1;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey) {
      window.localStorage.setItem(DAILY_COUNT_KEY, JSON.stringify({ date: todayKey, count: 1 }));
      return 1;
    }

    const nextCount = (Number(parsed.count) || 0) + 1;
    window.localStorage.setItem(DAILY_COUNT_KEY, JSON.stringify({ date: todayKey, count: nextCount }));
    return nextCount;
  } catch (error) {
    window.localStorage.setItem(DAILY_COUNT_KEY, JSON.stringify({ date: todayKey, count: 1 }));
    return 1;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, body] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const binary = window.atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function getRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function requestLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 4000,
        maximumAge: 60000,
      },
    );
  });
}

async function uploadPendingCapture(record) {
  if (!record?.backendUrl || !record?.authToken) {
    throw new Error("Missing backend URL or auth token");
  }

  const formData = new FormData();
  formData.append("image", dataUrlToBlob(record.imageDataUrl), `${record.id}.jpg`);

  if (record.gps?.lat != null) {
    formData.append("gps_lat", String(record.gps.lat));
  }

  if (record.gps?.lon != null) {
    formData.append("gps_lon", String(record.gps.lon));
  }

  if (record.voiceNote) {
    formData.append("voice_note", record.voiceNote);
  }

  const response = await fetch(`${record.backendUrl}/api/capture/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${record.authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  return response.json();
}

async function syncPendingCaptures() {
  const records = await getPendingCaptures();
  let uploadedCount = 0;

  for (const record of records) {
    try {
      await uploadPendingCapture(record);
      await deletePendingCapture(record.id);
      uploadedCount += 1;
    } catch (error) {
      // Keep failed items queued for the next sync attempt.
    }
  }

  return {
    uploadedCount,
    remaining: await getPendingCaptureCount(),
  };
}

async function requestBackgroundSync() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if ("sync" in registration) {
    try {
      await registration.sync.register("sync-pending-captures");
    } catch (error) {
      // Ignore sync registration failures and rely on foreground sync.
    }
  }

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SYNC_PENDING_CAPTURES" });
  }
}

function StatusPill({ online, pendingCount, todayCount }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
      <span className={`rounded-full px-3 py-1 ${online ? "bg-emerald-500/90 text-white" : "bg-amber-400/90 text-[#2b1f15]"}`}>
        {online ? "Live" : "Offline"}
      </span>
      <span className="rounded-full bg-black/35 px-3 py-1 text-white">{pendingCount} queued</span>
      <span className="rounded-full bg-black/35 px-3 py-1 text-white">{todayCount} today</span>
    </div>
  );
}

export default function MobileCapturePage() {
  const [mode, setMode] = useState("ready");
  const [pendingCount, setPendingCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [voiceNote, setVoiceNote] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState("Point the camera, tap once, and keep moving.");
  const [lastCapture, setLastCapture] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const backendUrl = getBackendBaseUrl();

  useEffect(() => {
    const updateQueueStats = async () => {
      setPendingCount(await getPendingCaptureCount());
      setTodayCount(await getTodayCaptureCount());
    };

    const handleOnline = async () => {
      setIsOnline(true);
      setStatusText("Connection restored. Syncing captures.");
      await requestBackgroundSync();
      const syncResult = await syncPendingCaptures();
      setPendingCount(syncResult.remaining);
      setStatusText(syncResult.uploadedCount > 0 ? `Synced ${syncResult.uploadedCount} capture(s).` : "Connection restored.");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatusText("Offline mode active. Captures will sync when you are back in range.");
    };

    const handleWorkerMessage = async (event) => {
      if (event.data?.type !== "SYNC_COMPLETE") {
        return;
      }

      await updateQueueStats();
      setStatusText(event.data.uploadedCount > 0 ? `Synced ${event.data.uploadedCount} capture(s).` : "Queue checked.");
    };

    const initCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatusText("Camera access is unavailable on this device.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        setStatusText("Camera permission is required for mobile capture.");
      }
    };

    initCamera();
    updateQueueStats();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleWorkerMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleWorkerMessage);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  const refreshCounts = async () => {
    setPendingCount(await getPendingCaptureCount());
    setTodayCount(await getTodayCaptureCount());
  };

  const handleCapture = async () => {
    if (!videoRef.current || mode === "processing") {
      return;
    }

    setMode("processing");
    setStatusText("Saving capture locally.");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context unavailable");
      }
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) {
        throw new Error("Unable to create image");
      }

      const gps = await requestLocation();
      const imageDataUrl = await blobToDataUrl(blob);
      const timestamp = new Date().toISOString();
      const authToken = localStorage.getItem("admin_token") || localStorage.getItem("token") || "";

      const record = {
        id: `capture_${Date.now()}`,
        imageDataUrl,
        thumbnailUrl: imageDataUrl,
        timestamp,
        gps,
        voiceNote,
        authToken,
        backendUrl,
      };

      await savePendingCapture(record);
      setLastCapture(record);
      setVoiceNote("");
      setTodayCount(incrementTodayCaptureCount());
      navigator.vibrate?.(70);

      if (isOnline && authToken) {
        await requestBackgroundSync();
        const syncResult = await syncPendingCaptures();
        setStatusText(
          syncResult.uploadedCount > 0
            ? `Captured and synced ${syncResult.uploadedCount} item${syncResult.uploadedCount === 1 ? "" : "s"}.`
            : "Saved locally. Sync will retry automatically.",
        );
      } else if (!authToken) {
        setStatusText("Saved locally. Sign in on the farm account to sync captures.");
      } else {
        setStatusText("Saved locally. This capture will sync when the connection returns.");
      }

      await refreshCounts();
    } catch (error) {
      setStatusText("Capture failed. Try again while keeping the tag in frame.");
    } finally {
      setMode("ready");
    }
  };

  const toggleVoiceNote = () => {
    const SpeechRecognition = getRecognitionConstructor();
    if (!SpeechRecognition) {
      setStatusText("Voice notes are not supported on this browser.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      recognitionRef.current = recognition;
      setIsListening(true);
      setStatusText("Listening for your voice note.");
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setVoiceNote(transcript);
        setStatusText(`Voice note ready: "${transcript}"`);
      }
    };

    recognition.onerror = () => {
      setStatusText("Voice note could not be recorded. Try once more.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleManualSync = async () => {
    setStatusText("Checking the upload queue.");
    await requestBackgroundSync();
    const syncResult = await syncPendingCaptures();
    await refreshCounts();
    setStatusText(
      syncResult.uploadedCount > 0
        ? `Synced ${syncResult.uploadedCount} capture(s).`
        : "No queued captures were uploaded this round.",
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#140f0a] text-white">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(213,180,100,0.18),transparent_42%),linear-gradient(180deg,rgba(12,10,7,0.08),rgba(12,10,7,0.76)_70%,rgba(12,10,7,0.92))]" />

      <div className="relative z-10 flex min-h-screen flex-col justify-between p-4 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="max-w-xs">
            <p className="text-xs uppercase tracking-[0.32em] text-[#f7d9a0]">Shiloh Snap</p>
            <h1 className="mt-2 text-2xl font-semibold">One-button livestock capture</h1>
            <p className="mt-2 text-sm text-white/80">{statusText}</p>
          </div>
          <StatusPill online={isOnline} pendingCount={pendingCount} todayCount={todayCount} />
        </header>

        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 pb-8">
          {voiceNote ? (
            <div className="w-full rounded-3xl border border-white/15 bg-black/35 px-4 py-3 text-sm text-white/85 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <span className="uppercase tracking-[0.24em] text-[#f7d9a0]">Voice Note Ready</span>
                <button
                  type="button"
                  onClick={() => setVoiceNote("")}
                  className="text-xs uppercase tracking-[0.24em] text-white/60"
                >
                  Clear
                </button>
              </div>
              <p className="mt-2 leading-6">{voiceNote}</p>
            </div>
          ) : null}

          {lastCapture ? (
            <div className="w-full rounded-[2rem] border border-white/10 bg-white/92 p-4 text-[#2b1f15] shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0f5132] text-white">
                  <Check className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Capture saved</p>
                  <p className="text-sm text-[#5f5247]">
                    {new Date(lastCapture.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" • "}
                    {isOnline ? "queued for live sync" : "queued offline"}
                  </p>
                </div>
                <div className="h-14 w-14 overflow-hidden rounded-2xl border border-[#e3d4bf]">
                  <img src={lastCapture.thumbnailUrl} alt="Latest capture" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-[2rem] border border-dashed border-white/20 bg-black/20 p-5 text-center text-sm text-white/70 backdrop-blur">
              Frame the animal broadside, keep the ear visible, then tap once.
            </div>
          )}

          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={toggleVoiceNote}
              className={`flex h-16 w-16 items-center justify-center rounded-full border transition ${
                isListening
                  ? "border-[#f7d9a0] bg-[#f7d9a0] text-[#2b1f15]"
                  : "border-white/25 bg-white/15 text-white backdrop-blur"
              }`}
            >
              <Mic className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={handleCapture}
              disabled={mode === "processing"}
              className="relative flex h-28 w-28 items-center justify-center rounded-full border-[6px] border-white/90 bg-white/20 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {mode === "processing" ? (
                <RefreshCw className="h-10 w-10 animate-spin text-white" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#2b1f15]">
                  <Camera className="h-9 w-9" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleManualSync}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur"
            >
              <Upload className="h-6 w-6" />
            </button>
          </div>

          <div className="grid w-full grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-2xl bg-black/25 px-3 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Queue</p>
              <p className="mt-2 text-xl font-semibold">{pendingCount}</p>
            </div>
            <div className="rounded-2xl bg-black/25 px-3 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Today</p>
              <p className="mt-2 text-xl font-semibold">{todayCount}</p>
            </div>
            <div className="rounded-2xl bg-black/25 px-3 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Mode</p>
              <p className="mt-2 flex items-center justify-center gap-2 text-base font-semibold">
                {isOnline ? <Check className="h-4 w-4 text-emerald-300" /> : <WifiOff className="h-4 w-4 text-amber-300" />}
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
