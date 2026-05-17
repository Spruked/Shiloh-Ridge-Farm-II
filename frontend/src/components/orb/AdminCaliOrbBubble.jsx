import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { DatabaseBackup, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { getApiBaseUrl } from '../../lib/backend';

const ORB_SIZE = 108;
const EDGE_PADDING = 16;
const ORB_POSITION_STORAGE_KEY = 'cali_orb_position_v3';
const CURSOR_SAMPLE_INTERVAL_MS = 120;
const CURSOR_HISTORY_MAX = 160;
const AUTONOMOUS_DRIFT_INTERVAL_MS = 1200;
const AUTONOMOUS_DRIFT_RADIUS = 16;
const AUTONOMOUS_PAUSE_AFTER_DRAG_MS = 7000;
const SUMMON_STANDOFF_PX = 500;
const SUMMON_ACTIVE_MS = 9000;
const VOICE_RECOGNITION_ENABLED_KEY = 'cali_voice_recognition_enabled_v1';
const VOICE_OUTPUT_ENABLED_KEY = 'cali_voice_output_enabled_v1';
const PREFER_BACKEND_VOICE_KEY = 'cali_prefer_backend_voice_v1';
const SITE_ORB_NAME = 'Shep';
const SITE_ORB_CORE_NAME = 'Renova_te_ipsum';

const clampOrbPosition = (x, y) => {
  const maxX = Math.max(EDGE_PADDING, window.innerWidth - ORB_SIZE - EDGE_PADDING);
  const maxY = Math.max(EDGE_PADDING, window.innerHeight - ORB_SIZE - EDGE_PADDING);
  return {
    x: Math.min(Math.max(x, EDGE_PADDING), maxX),
    y: Math.min(Math.max(y, EDGE_PADDING), maxY),
  };
};

const getIdleRestPosition = () => {
  const x = window.innerWidth - ORB_SIZE - EDGE_PADDING - 24;
  const y = EDGE_PADDING + 18;
  return clampOrbPosition(x, y);
};

const getDefaultOrbPosition = () => getIdleRestPosition();

const loadOrbPosition = () => {
  try {
    const raw = localStorage.getItem(ORB_POSITION_STORAGE_KEY);
    if (!raw) return getDefaultOrbPosition();
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') {
      return getDefaultOrbPosition();
    }
    return clampOrbPosition(parsed.x, parsed.y);
  } catch (_error) {
    return getDefaultOrbPosition();
  }
};

const persistOrbPosition = (position) => {
  try {
    localStorage.setItem(ORB_POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch (_error) {
    // Non-blocking persistence.
  }
};

const loadVoiceRecognitionEnabled = () => {
  try {
    const value = localStorage.getItem(VOICE_RECOGNITION_ENABLED_KEY);
    return value == null ? true : value === 'true';
  } catch (_error) {
    return true;
  }
};

const loadVoiceOutputEnabled = () => {
  try {
    return localStorage.getItem(VOICE_OUTPUT_ENABLED_KEY) !== 'false';
  } catch (_error) {
    return true;
  }
};

const loadPreferBackendVoice = () => {
  try {
    return localStorage.getItem(PREFER_BACKEND_VOICE_KEY) !== 'false';
  } catch (_error) {
    return true;
  }
};

const persistSetting = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (_error) {
    // Non-blocking persistence.
  }
};

const loadAdminDisplayName = () => {
  try {
    const raw = (localStorage.getItem('admin_username') || '').trim();
    if (!raw) return 'Dominic';
    return raw.toLowerCase().includes('dominic') ? raw : 'Dominic';
  } catch (_error) {
    return 'Dominic';
  }
};

const getCursorZone = (x, y) => {
  const horizontal = x < 0.33 ? 'left' : x > 0.66 ? 'right' : 'center';
  const vertical = y < 0.33 ? 'top' : y > 0.66 ? 'bottom' : 'middle';
  return `${horizontal}_${vertical}`;
};

const ZONE_ANCHORS = {
  left_top: { x: 0.14, y: 0.16 },
  left_middle: { x: 0.12, y: 0.5 },
  left_bottom: { x: 0.14, y: 0.82 },
  center_top: { x: 0.5, y: 0.14 },
  center_middle: { x: 0.5, y: 0.5 },
  center_bottom: { x: 0.5, y: 0.84 },
  right_top: { x: 0.86, y: 0.16 },
  right_middle: { x: 0.88, y: 0.5 },
  right_bottom: { x: 0.86, y: 0.82 },
};

const complementaryZone = (zone) => {
  if (!zone || typeof zone !== 'string') return 'right_middle';
  const [horizontal, vertical] = zone.split('_');
  const oppositeHorizontal = horizontal === 'left' ? 'right' : horizontal === 'right' ? 'left' : 'center';
  const oppositeVertical = vertical === 'top' ? 'bottom' : vertical === 'bottom' ? 'top' : 'middle';
  return `${oppositeHorizontal}_${oppositeVertical}`;
};

const CaliLogo = ({ size = 48, className = '' }) => (
  <img
    src="/ShilohRidgeFarmicon256.png"
    alt="Shep ORB"
    width={size}
    height={size}
    className={`object-contain ${className}`}
    draggable={false}
  />
);

const AdminCaliOrbBubble = ({ pageContext = 'general' }) => {
  const apiBaseUrl = getApiBaseUrl();

  const orbButtonRef = useRef(null);
  const orbPositionRef = useRef(getDefaultOrbPosition());
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const isDraggingRef = useRef(false);
  const manualControlPauseUntilRef = useRef(0);
  const summonUntilRef = useRef(0);
  const lastCursorClientRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth * 0.75 : 640,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.28 : 220,
  });

  const cursorHistoryRef = useRef([]);
  const cursorZoneCountsRef = useRef({});
  const totalCursorDistanceRef = useRef(0);
  const lastCursorPointRef = useRef(null);
  const lastCursorSampleRef = useRef(0);
  const lastCursorMovementRef = useRef(Date.now());

  const audioRef = useRef(null);
  const bubbleTimerRef = useRef(null);
  const intervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const triggerCaliRef = useRef(() => {});
  const hasAnnouncedPresenceRef = useRef(false);

  const [sessionId, setSessionId] = useState('');
  const [orbPosition, setOrbPosition] = useState(loadOrbPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [bubbleText, setBubbleText] = useState('Shep online.');
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [audioEngine, setAudioEngine] = useState('qwen3-tts');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(loadVoiceRecognitionEnabled);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(loadVoiceOutputEnabled);
  const [preferBackendVoice, setPreferBackendVoice] = useState(loadPreferBackendVoice);
  const [isListening, setIsListening] = useState(false);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');

  const palette = {
    core: '#0f5132',
    coreDark: '#0a3c24',
    glow: 'rgba(15,81,50,0.45)',
    ring: 'rgba(183,134,58,0.40)',
    accent: '#b6863a',
    bubbleBg: '#f7f3e7',
    bubbleBorder: '#d8c6a1',
    bubbleText: '#13361f',
  };

  useEffect(() => {
    orbPositionRef.current = orbPosition;
  }, [orbPosition]);

  useEffect(() => {
    setSessionId(`cali_${Math.random().toString(36).slice(2, 11)}`);
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const spoken = [];
      for (let idx = event.resultIndex; idx < event.results.length; idx += 1) {
        const result = event.results[idx];
        if (result.isFinal && result[0]?.transcript) {
          spoken.push(result[0].transcript.trim());
        }
      }
      const transcript = spoken.join(' ').trim();
      if (transcript) {
        setBubbleVisible(true);
        setBubbleText(`Heard: "${transcript}"`);
        triggerCaliRef.current(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceEnabled(false);
        localStorage.setItem(VOICE_RECOGNITION_ENABLED_KEY, 'false');
        setBubbleVisible(true);
        setBubbleText('Microphone permission blocked. Enable mic access to use Shep voice input.');
      } else if (event.error !== 'no-speech') {
        setBubbleVisible(true);
        setBubbleText(`Voice input error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch (_error) {
        // Ignore.
      }
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (event) => {
      lastCursorClientRef.current = { x: event.clientX, y: event.clientY };
      const now = Date.now();
      if (now - lastCursorSampleRef.current < CURSOR_SAMPLE_INTERVAL_MS) {
        return;
      }

      const xRatio = window.innerWidth ? event.clientX / window.innerWidth : 0;
      const yRatio = window.innerHeight ? event.clientY / window.innerHeight : 0;
      const zone = getCursorZone(xRatio, yRatio);
      cursorZoneCountsRef.current = {
        ...cursorZoneCountsRef.current,
        [zone]: (cursorZoneCountsRef.current[zone] || 0) + 1,
      };

      let speed = 0;
      if (lastCursorPointRef.current) {
        const dx = event.clientX - lastCursorPointRef.current.x;
        const dy = event.clientY - lastCursorPointRef.current.y;
        const dt = Math.max(now - lastCursorPointRef.current.t, 1);
        const distance = Math.hypot(dx, dy);
        totalCursorDistanceRef.current += distance;
        speed = (distance / dt) * 1000;
      }

      const sample = {
        x: Number(xRatio.toFixed(4)),
        y: Number(yRatio.toFixed(4)),
        speed: Number(speed.toFixed(2)),
        t: now,
      };
      cursorHistoryRef.current = [...cursorHistoryRef.current, sample].slice(-CURSOR_HISTORY_MAX);
      lastCursorPointRef.current = { x: event.clientX, y: event.clientY, t: now };
      lastCursorMovementRef.current = now;
      lastCursorSampleRef.current = now;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const clamped = clampOrbPosition(orbPositionRef.current.x, orbPositionRef.current.y);
      orbPositionRef.current = clamped;
      setOrbPosition(clamped);
      persistOrbPosition(clamped);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onPointerMove = (event) => {
      if (!isDraggingRef.current) return;
      const nextPosition = clampOrbPosition(
        event.clientX - dragOffsetRef.current.x,
        event.clientY - dragOffsetRef.current.y,
      );
      if (
        Math.abs(nextPosition.x - orbPositionRef.current.x) > 1
        || Math.abs(nextPosition.y - orbPositionRef.current.y) > 1
      ) {
        suppressClickRef.current = true;
      }
      orbPositionRef.current = nextPosition;
      setOrbPosition(nextPosition);
    };

    const onPointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      manualControlPauseUntilRef.current = Date.now() + AUTONOMOUS_PAUSE_AFTER_DRAG_MS;
      persistOrbPosition(orbPositionRef.current);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  useEffect(() => {
    const driftTimer = window.setInterval(() => {
      if (isDraggingRef.current) return;
      if (Date.now() < manualControlPauseUntilRef.current) return;

      const awareness = snapshotCursorAwareness();
      const current = orbPositionRef.current;
      const cursor = lastCursorClientRef.current;
      let next;

      if (Date.now() < summonUntilRef.current && cursor) {
        // Summoned mode: approach cursor vicinity while preserving ~500px stand-off distance.
        const orbCenterX = current.x + (ORB_SIZE / 2);
        const orbCenterY = current.y + (ORB_SIZE / 2);
        let dx = orbCenterX - cursor.x;
        let dy = orbCenterY - cursor.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 1) {
          dx = 1;
          dy = -1;
          dist = Math.hypot(dx, dy);
        }
        const ux = dx / dist;
        const uy = dy / dist;
        const targetX = cursor.x + (ux * SUMMON_STANDOFF_PX) - (ORB_SIZE / 2);
        const targetY = cursor.y + (uy * SUMMON_STANDOFF_PX) - (ORB_SIZE / 2);
        const speedFactor = Math.min(Math.max(awareness.recent_average_speed_px_s / 850, 0.06), 0.3);
        const blend = 0.18 + speedFactor;
        next = clampOrbPosition(
          current.x + ((targetX - current.x) * blend),
          current.y + ((targetY - current.y) * blend),
        );
      } else {
        // Idle mode: free-floating around an upper-right rest home.
        const idle = getIdleRestPosition();
        next = clampOrbPosition(
          current.x + ((idle.x - current.x) * 0.16) + ((Math.random() * 2 - 1) * AUTONOMOUS_DRIFT_RADIUS),
          current.y + ((idle.y - current.y) * 0.16) + ((Math.random() * 2 - 1) * AUTONOMOUS_DRIFT_RADIUS),
        );
      }

      orbPositionRef.current = next;
      setOrbPosition(next);
      persistOrbPosition(next);
    }, AUTONOMOUS_DRIFT_INTERVAL_MS);

    return () => window.clearInterval(driftTimer);
  }, []);

  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      window.speechSynthesis?.cancel?.();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const snapshotCursorAwareness = () => {
    const history = cursorHistoryRef.current;
    const recent = history.slice(-12);
    const avgSpeed = history.length
      ? history.reduce((sum, item) => sum + item.speed, 0) / history.length
      : 0;
    const recentAvgSpeed = recent.length
      ? recent.reduce((sum, item) => sum + item.speed, 0) / recent.length
      : 0;

    let dominantZone = null;
    let dominantCount = 0;
    Object.entries(cursorZoneCountsRef.current).forEach(([zone, count]) => {
      if (count > dominantCount) {
        dominantZone = zone;
        dominantCount = count;
      }
    });

    return {
      sample_count: history.length,
      average_speed_px_s: Number(avgSpeed.toFixed(2)),
      recent_average_speed_px_s: Number(recentAvgSpeed.toFixed(2)),
      total_distance_px: Number(totalCursorDistanceRef.current.toFixed(1)),
      dominant_zone: dominantZone,
      idle_ms: Math.max(0, Date.now() - lastCursorMovementRef.current),
    };
  };

  const animateSpeechText = (text) => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }

    const words = (text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      setBubbleText('');
      return;
    }

    setBubbleText('');
    let idx = 0;
    intervalRef.current = window.setInterval(() => {
      idx += 1;
      setBubbleText(words.slice(0, idx).join(' '));
      if (idx >= words.length) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 90);
  };

  const speakFallback = (text, fallbackFromBackend = false) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1.02;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
    setAudioEngine(fallbackFromBackend ? 'browser_fallback' : 'browser_tts');
  };

  const stopVoiceListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch (_error) {
      // Ignore stop errors from inactive recognizer state.
    }
    setIsListening(false);
  };

  const startVoiceListening = () => {
    if (!voiceSupported || !voiceEnabled || !sessionId || isThinking) return;
    const recognition = recognitionRef.current;
    if (!recognition || isListening) return;

    try {
      recognition.start();
      setIsListening(true);
      setBubbleVisible(true);
      setBubbleText(pageContext === 'admin' ? 'Listening for your admin command...' : 'Listening for your farm question...');
    } catch (_error) {
      setBubbleVisible(true);
      setBubbleText('Voice recognition could not start. Check microphone permissions.');
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (!sessionId || !voiceSupported || !voiceEnabled) return undefined;
    const timer = window.setTimeout(() => {
      if (!isThinking) {
        startVoiceListening();
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [sessionId, pageContext, voiceSupported, voiceEnabled, isThinking]);

  const handleVoiceToggle = () => {
    const nextValue = !voiceEnabled;
    setVoiceEnabled(nextValue);
    persistSetting(VOICE_RECOGNITION_ENABLED_KEY, nextValue ? 'true' : 'false');

    if (!nextValue) {
      stopVoiceListening();
      return;
    }

    if (!voiceSupported) {
      setBubbleVisible(true);
      setBubbleText('This browser does not support built-in speech recognition.');
      return;
    }

    startVoiceListening();
  };

  const handleVoiceOutputToggle = () => {
    const nextValue = !voiceOutputEnabled;
    setVoiceOutputEnabled(nextValue);
    persistSetting(VOICE_OUTPUT_ENABLED_KEY, nextValue ? 'true' : 'false');

    if (!nextValue) {
      window.speechSynthesis?.cancel?.();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setAudioEngine('muted');
    }
  };

  const handleVoiceOutputPreferenceToggle = () => {
    const nextValue = !preferBackendVoice;
    setPreferBackendVoice(nextValue);
    persistSetting(PREFER_BACKEND_VOICE_KEY, nextValue ? 'true' : 'false');
  };

  const triggerCali = async (message) => {
    if (!sessionId || isThinking) return;

    const token = localStorage.getItem('admin_token');
    setIsThinking(true);
    setBubbleVisible(true);
    summonUntilRef.current = Date.now() + SUMMON_ACTIVE_MS;

    try {
      const response = await axios.post(
        `${apiBaseUrl}${token ? '/orb/chat' : '/orb/site-chat'}`,
        {
          message,
          session_id: sessionId,
          page_context: pageContext,
          context: {
            ui_mode: 'floating_orb_voice_only',
            cursor_awareness: snapshotCursorAwareness(),
            requested_cpp_version: '3.0',
            route_path: window.location.pathname,
            assistant_name: SITE_ORB_NAME,
            system_core: SITE_ORB_CORE_NAME,
            llm_model: 'qwen2.5:3b',
            tts_engine: 'qwen3-tts',
            cochlear_processor: 'CP 3.0',
            no_fallback: true,
            require_upstream_llm: true,
          },
        },
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined,
      );

      const payload = response.data || {};
      const responseText = payload.response_text || payload.response || 'Shep is online.';

      animateSpeechText(responseText);

      if (bubbleTimerRef.current) {
        window.clearTimeout(bubbleTimerRef.current);
      }
      bubbleTimerRef.current = window.setTimeout(() => {
        setBubbleVisible(true);
      }, 700);

      if (voiceOutputEnabled) {
        if (payload.audio_wav_base64 && preferBackendVoice) {
          const audio = new Audio(`data:audio/wav;base64,${payload.audio_wav_base64}`);
          audioRef.current = audio;
          try {
            await audio.play();
            setAudioEngine(payload.audio_engine || 'qwen3-tts');
          } catch (_err) {
            speakFallback(responseText, true);
          }
        } else {
          speakFallback(responseText, preferBackendVoice);
        }
      }
    } catch (error) {
      setBubbleVisible(true);
      setBubbleText(
        error?.response?.status === 401
          ? 'Session expired. Please log in again.'
          : `${SITE_ORB_NAME} backend unavailable right now. Check local Qwen/CP 3.0 services.`,
      );
    } finally {
      setIsThinking(false);
    }
  };

  const runArmsBackupIngest = async () => {
    if (isRunningBackup) return;

    const token = localStorage.getItem('admin_token');
    if (!token) {
      setBubbleVisible(true);
      setBubbleText('Admin token missing. Log in again to run Shep backup ingest.');
      return;
    }

    setIsRunningBackup(true);
    setBackupStatus('Running USDA ARMS backup ingest...');
    setBubbleVisible(true);
    setBubbleText('Running Shep backup ingest now. I will report completion in a moment.');

    try {
      const response = await axios.post(
        `${apiBaseUrl}/orb/backup/ingest-arms`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const payload = response.data || {};
      const result = payload.result || {};
      const summary = `Backup ingest complete: ${result.variables_ingested || 0} variables across ${result.reports_covered || 0} reports.`;
      setBackupStatus(summary);
      setBubbleText(summary);
      if (voiceOutputEnabled) {
        speakFallback(summary, preferBackendVoice);
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const failMessage = detail || 'Backup ingest failed. Check backend logs.';
      setBackupStatus(failMessage);
      setBubbleText(failMessage);
      if (voiceOutputEnabled) {
        speakFallback(failMessage, preferBackendVoice);
      }
    } finally {
      setIsRunningBackup(false);
    }
  };

  useEffect(() => {
    triggerCaliRef.current = triggerCali;
  }, [triggerCali]);

  useEffect(() => {
    if (!sessionId) return;
    if (!hasAnnouncedPresenceRef.current) {
      hasAnnouncedPresenceRef.current = true;
      const ownerName = loadAdminDisplayName();
      const greetings = [
        `Hello ${ownerName}, I am ${SITE_ORB_NAME}.`,
        `Hello ${ownerName}, I am here to help.`,
        `${ownerName}, ${SITE_ORB_NAME} is online and ready.`,
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      setBubbleVisible(true);
      animateSpeechText(greeting);
      if (voiceOutputEnabled && !preferBackendVoice) {
        speakFallback(greeting);
      }

      const timer = window.setTimeout(() => {
        triggerCali(
          `${ownerName} is the owner and just logged in. You are Shep, the custom Shiloh Ridge website ORB powered by the Renova_te_ipsum core. Greet ${ownerName} by name in one short natural variation, then give a concise admin status update for this page and one next step.`,
        );
      }, 550);
      return () => window.clearTimeout(timer);
    }

    triggerCali('Give me a concise status update for this page and one next step.');
  }, [sessionId, pageContext]);

  const handleOrbPointerDown = (event) => {
    if (event.button !== 0) return;
    const rect = orbButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    suppressClickRef.current = false;
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleOrbClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    triggerCali('Quick status refresh for this page.');
  };

  const orbStyle = {
    background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.7), transparent 22%), linear-gradient(135deg, ${palette.core}, ${palette.coreDark} 54%, #082616)`,
    boxShadow: `0 0 0 6px ${palette.ring}, 0 0 36px 10px ${palette.glow}, 0 16px 42px rgba(0,0,0,0.45)`,
    touchAction: 'none',
    userSelect: 'none',
  };

  return (
    <>
      {false && bubbleVisible && (
        <div className="pointer-events-none fixed right-5 top-1/2 z-[68] w-[min(420px,72vw)] -translate-y-1/2">
          <div
            className="rounded-2xl border px-4 py-3 shadow-2xl"
            style={{
              background: palette.bubbleBg,
              borderColor: palette.bubbleBorder,
              color: palette.bubbleText,
            }}
          >
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: palette.core }}>
              <Volume2 className="h-3.5 w-3.5" />
              {SITE_ORB_NAME} · {SITE_ORB_CORE_NAME} · CP 3.0 · {audioEngine}
            </div>
            <p className="text-sm leading-relaxed">
              {isThinking ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                </span>
              ) : (
                bubbleText
              )}
            </p>
          </div>
        </div>
      )}

      {false && (
      <div className="pointer-events-auto fixed bottom-5 right-5 z-[69] w-[min(380px,86vw)]">
        <div
          className="rounded-2xl border px-4 py-3 shadow-2xl"
          style={{
            background: palette.bubbleBg,
            borderColor: palette.bubbleBorder,
            color: palette.bubbleText,
          }}
        >
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: palette.core }}>
            {SITE_ORB_NAME} Controls · Custom ORB
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleVoiceOutputToggle}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                voiceOutputEnabled ? 'border-[#0f5132] bg-[#0f5132]/10 text-[#0f5132]' : 'border-[#c5b188] bg-transparent text-[#21432f]'
              }`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              Voice Output {voiceOutputEnabled ? 'On' : 'Off'}
            </button>

            {voiceOutputEnabled && (
              <button
                type="button"
                onClick={handleVoiceOutputPreferenceToggle}
                className="inline-flex items-center gap-2 rounded-full border border-[#b6863a] bg-[#b6863a]/15 px-3 py-1.5 text-xs font-semibold text-[#13361f] transition-colors hover:bg-[#b6863a]/30"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Output: {preferBackendVoice ? 'Qwen 3 TTS' : 'Browser'}
              </button>
            )}

            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                voiceEnabled ? 'border-[#0f5132] bg-[#0f5132] text-white' : 'border-[#c5b188] bg-transparent text-[#21432f]'
              }`}
            >
              {voiceEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              Voice Input {voiceEnabled ? 'On' : 'Off'}
            </button>

            {voiceEnabled && (
              <button
                type="button"
                onClick={isListening ? stopVoiceListening : startVoiceListening}
                className="inline-flex items-center gap-2 rounded-full border border-[#b6863a] bg-[#b6863a]/15 px-3 py-1.5 text-xs font-semibold text-[#13361f] transition-colors hover:bg-[#b6863a]/30"
              >
                {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {isListening ? 'Stop Listening' : 'Listen Now'}
              </button>
            )}

            <button
              type="button"
              onClick={runArmsBackupIngest}
              disabled={isRunningBackup}
              className="inline-flex items-center gap-2 rounded-full border border-[#21432f] bg-[#21432f]/10 px-3 py-1.5 text-xs font-semibold text-[#13361f] transition-colors hover:bg-[#21432f]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunningBackup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DatabaseBackup className="h-3.5 w-3.5" />}
              {isRunningBackup ? 'Running Backup...' : 'Run ARMS Backup'}
            </button>
          </div>

          <p className="mt-2 text-xs leading-relaxed" style={{ color: palette.coreDark }}>
            {voiceSupported
              ? voiceEnabled
                ? (isListening ? 'Mic is active. Speak a Shep command now.' : 'Voice input is enabled. Tap "Listen Now" to capture a command.')
                : 'Voice input is disabled.'
              : 'Voice recognition is unavailable in this browser.'}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: palette.coreDark }}>
            {voiceOutputEnabled
              ? `Voice output is enabled (${preferBackendVoice ? 'prefer Qwen 3 TTS with browser fallback' : 'browser mode'}).`
              : 'Voice output is disabled.'}
          </p>

          {backupStatus && (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: palette.coreDark }}>
              {backupStatus}
            </p>
          )}
        </div>
      </div>
      )}

      <div
        className="pointer-events-auto fixed z-[70]"
        style={{
          left: `${orbPosition.x}px`,
          top: `${orbPosition.y}px`,
          transition: isDragging ? 'none' : 'left 2.2s ease, top 2.2s ease',
        }}
      >
        <button
          ref={orbButtonRef}
          type="button"
          onPointerDown={handleOrbPointerDown}
          onClick={handleOrbClick}
          className={`relative flex h-[108px] w-[108px] items-center justify-center rounded-full transition-all duration-500 hover:scale-105 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={orbStyle}
          aria-label="Refresh Shep"
          title="Shep status refresh"
        >
          <span className="absolute inset-[7px] rounded-full border border-white/25 pointer-events-none" />
          <CaliLogo size={58} className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          {isThinking && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#0a3c24] bg-[#b6863a] text-[#072314]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export default AdminCaliOrbBubble;
