import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Loader2, Mic, MicOff, Power, Volume2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getApiBaseUrl, getBackendBaseUrl } from '../../lib/backend';
import { resolveMediaUrl } from '../../lib/media';

const ORB_SIZE = 184;
const EDGE_PADDING = 16;
const ORB_POSITION_STORAGE_KEY = 'cali_orb_position_v3';
const VOICE_RECOGNITION_ENABLED_KEY = 'cali_voice_recognition_enabled_v1';
const VOICE_OUTPUT_ENABLED_KEY = 'cali_voice_output_enabled_v2';
const SHEP_ADMIN_OVERRIDE_KEY = 'shep_admin_override_enabled_v1';
const SUMMON_ACTIVE_MS = 9000;
const AUTONOMOUS_DRIFT_INTERVAL_MS = 60;
const AUTONOMOUS_PAUSE_AFTER_DRAG_MS = 7000;
const ORB_GLIDE_FACTOR = 0.018;
const CURSOR_COMFORT_RADIUS = ORB_SIZE * 1.35;
const CURSOR_NUDGE_LIMIT = 6.5;
const IDLE_SLEEP_AFTER_MS = 5 * 60 * 1000;
const PING_VISIBLE_MS = 8000;
const VOICE_RECORDING_MAX_MS = 8000;
const NAV_HIGHLIGHT_KEY = 'shep_nav_highlight_v1';
const SITE_ORB_NAME = 'Shep';
const SITE_ORB_CORE_NAME = 'Renova_te_ipsum';
const ROAM_POINT_MIN_EDGE = 90;
const DOCTRINE_VERSION = 'DOCTRINE_v1.0+B+C+D';
const DOCTRINE_RATIFIED_DATE = '2026-03-05';
const DOCTRINE_STATUS = 'SEALED / IMMUTABLE';
const DOCTRINE_FILE_HASH = '40ba941c6352ee6c85847ff0bbba689158b2f58d3384972ffdbc9f401dd9b387';
const DOCTRINE_BASELINE_HASH = 'b601457ace7f0639f790ec8f573bc343363d19f6e53291f3ab04e5e97a2b8c4e';
const PRIMARY_MODEL = 'qwen2.5:3b';
const FALLBACK_MODEL = 'llama3.2:1b';
const SHEP_MORB_EXPLAINED_KEY = 'shep_morb_explained_v1';
const COLD_START_GREETING_TEXT = 'Hello, I am Shep. Ask me anything for site information. If your browser asks for microphone access, approve it so I can hear you.';
const SHEP_CACHED_GREETING_URL = `${getBackendBaseUrl()}/audio/shep-welcome.wav`;
const SHEP_ORB_SKIN_URL = resolveMediaUrl('assets/images/shep better1024.png');

const ORB_NAV_TARGETS = [
  { match: /(livestock|sheep|ram|ewe|tag|bloodline)/i, path: '/livestock', selector: '[data-testid="livestock-search-input"]' },
  { match: /(product|order|cut|butcher|freezer)/i, path: '/products', selector: 'h1' },
  { match: /(contact|call|email|message|reach)/i, path: '/contact', selector: '[data-testid="contact-form"]' },
  { match: /(katahdin|breed|traits|registry)/i, path: '/katahdin', selector: '#traits' },
  { match: /(checkout|payment|coupon|delivery)/i, path: '/checkout', selector: 'input[placeholder="Full name"]' },
  { match: /(cart|basket)/i, path: '/cart', selector: 'h1' },
  { match: /(home|start|main)/i, path: '/', selector: '[data-testid="hero-title"]' },
];

const ORB_ADMIN_NAV_TARGETS = [
  { match: /(admin dashboard|owner dashboard|overview)/i, path: '/admin/dashboard', selector: '[data-testid="admin-header-title"], h1' },
  { match: /(about page|about content)/i, path: '/admin/about', selector: 'h1, h2' },
  { match: /(blog|blog posts)/i, path: '/admin/blog', selector: 'h1, h2' },
  { match: /(butch assistant|butch settings)/i, path: '/admin/butch', selector: 'h1, h2' },
  { match: /(customer records|customers)/i, path: '/admin/customers', selector: 'h1, h2' },
  { match: /(farm pricing|market pricing|pricing records)/i, path: '/admin/farm-pricing', selector: 'h1, h2' },
  { match: /(livestock management|animal records|edit livestock)/i, path: '/admin/livestock', selector: '[data-testid="livestock-management-title"]' },
  { match: /(orders|order management)/i, path: '/admin/orders', selector: 'h1, h2' },
  { match: /(products|product management)/i, path: '/admin/products', selector: 'h1, h2' },
  { match: /(inventory)/i, path: '/admin/inventory', selector: 'h1, h2' },
  { match: /(sales)/i, path: '/admin/sales', selector: 'h1, h2' },
  { match: /(accounting|expenses|financial records)/i, path: '/admin/accounting', selector: 'h1, h2' },
  { match: /(nft|minting|certificates)/i, path: '/admin/nft', selector: 'h1, h2' },
  { match: /(contacts|messages|inquiries)/i, path: '/admin/contacts', selector: '[data-testid="contact-management-title"]' },
  { match: /(review queue|human review|escalations)/i, path: '/admin/review-queue', selector: 'h1, h2' },
  { match: /(analytics|reports)/i, path: '/admin/analytics', selector: 'h1, h2' },
  { match: /(settings|api keys)/i, path: '/admin/settings', selector: '[data-testid="settings-title"]' },
];

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

const getSpeakingPerch = () => clampOrbPosition(
  Math.max(EDGE_PADDING, window.innerWidth - ORB_SIZE - 390),
  Math.max(EDGE_PADDING + 80, Math.min(window.innerHeight * 0.3, window.innerHeight - ORB_SIZE - EDGE_PADDING)),
);

const distanceFromCursor = (position, cursor) => Math.hypot(
  position.x + (ORB_SIZE / 2) - cursor.x,
  position.y + (ORB_SIZE / 2) - cursor.y,
);

const pickRoamTarget = (cursor) => {
  const maxX = Math.max(EDGE_PADDING, window.innerWidth - ORB_SIZE - EDGE_PADDING);
  const maxY = Math.max(EDGE_PADDING, window.innerHeight - ORB_SIZE - EDGE_PADDING);
  let best = clampOrbPosition(
    EDGE_PADDING + (Math.random() * Math.max(0, maxX - EDGE_PADDING)),
    EDGE_PADDING + (Math.random() * Math.max(0, maxY - EDGE_PADDING)),
  );
  let bestDistance = distanceFromCursor(best, cursor);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = clampOrbPosition(
      EDGE_PADDING + (Math.random() * Math.max(0, maxX - EDGE_PADDING)),
      EDGE_PADDING + (Math.random() * Math.max(0, maxY - EDGE_PADDING)),
    );
    const cursorDistance = distanceFromCursor(candidate, cursor);
    if (cursorDistance > bestDistance) {
      best = candidate;
      bestDistance = cursorDistance;
    }
    if (cursorDistance >= CURSOR_COMFORT_RADIUS * 1.7) return candidate;
  }
  return best;
};

const loadOrbPosition = () => {
  try {
    const raw = localStorage.getItem(ORB_POSITION_STORAGE_KEY);
    if (!raw) return getIdleRestPosition();
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return getIdleRestPosition();
    return clampOrbPosition(parsed.x, parsed.y);
  } catch (_error) {
    return getIdleRestPosition();
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
  return true;
};

const loadShepEnabled = () => {
  try {
    return localStorage.getItem(SHEP_ADMIN_OVERRIDE_KEY) !== 'false';
  } catch (_error) {
    return true;
  }
};

const resolveToolNavTarget = (toolCalls, isAdmin = false) => {
  const call = (Array.isArray(toolCalls) ? toolCalls : []).find(
    (item) => item?.name === 'orb_site_navigate' && item?.arguments?.path,
  );
  if (!call) return null;
  const targets = isAdmin ? [...ORB_ADMIN_NAV_TARGETS, ...ORB_NAV_TARGETS] : ORB_NAV_TARGETS;
  const target = targets.find((item) => item.path === call.arguments.path);
  if (!target) return null;
  const mappedPointer = call?.result?.pointer_map?.matches?.find(
    (record) => record?.semantic_locator && record?.runtime_policy?.may_point !== false,
  );
  return mappedPointer ? { ...target, selector: mappedPointer.semantic_locator } : target;
};

const readLocalJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch (_error) {
    return {};
  }
};

const AdminCaliOrbBubble = ({ pageContext = 'general' }) => {
  const apiBaseUrl = getApiBaseUrl();
  const navigate = useNavigate();
  const location = useLocation();

  const orbButtonRef = useRef(null);
  const orbPositionRef = useRef(loadOrbPosition());
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const isDraggingRef = useRef(false);
  const manualControlPauseUntilRef = useRef(0);
  const summonUntilRef = useRef(0);
  const cursorApproachUntilRef = useRef(0);
  const lastCursorMovementRef = useRef(Date.now());
  const cursorPositionRef = useRef({ x: -1000, y: -1000 });
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const pingClearTimerRef = useRef(null);
  const bubbleHideTimerRef = useRef(null);
  const dormantRef = useRef(false);
  const roamTargetRef = useRef(null);
  const coldStartGreetingDoneRef = useRef(false);
  const coldStartMicRequestedRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingStopTimerRef = useRef(null);

  const [sessionId, setSessionId] = useState('');
  const [orbPosition, setOrbPosition] = useState(loadOrbPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [bubbleText, setBubbleText] = useState('Shep is listening. Speak to start.');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [audioEngine, setAudioEngine] = useState('qwen-tts');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(loadVoiceRecognitionEnabled);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(loadVoiceOutputEnabled);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ping, setPing] = useState(null);
  const [showVoiceRecovery, setShowVoiceRecovery] = useState(false);
  const [orbSignal, setOrbSignal] = useState('green');
  const [shepEnabled, setShepEnabled] = useState(loadShepEnabled);
  const [coldStartReady, setColdStartReady] = useState(false);
  const [showColdStartPrompt, setShowColdStartPrompt] = useState(false);
  const [micPermissionStatus, setMicPermissionStatus] = useState('unknown');
  const [evidencePointers, setEvidencePointers] = useState([]);
  const [sourcePreview, setSourcePreview] = useState(null);

  useEffect(() => {
    orbPositionRef.current = orbPosition;
  }, [orbPosition]);

  useEffect(() => {
    if (isThinking || isListening || isSpeaking) {
      if (bubbleHideTimerRef.current) window.clearTimeout(bubbleHideTimerRef.current);
      setBubbleVisible(true);
    }
  }, [isThinking, isListening, isSpeaking]);

  useEffect(() => {
    if (isThinking && !isSpeaking) {
      roamTargetRef.current = getSpeakingPerch();
    }
  }, [isThinking, isSpeaking]);

  useEffect(() => {
    if (isThinking || isListening || isSpeaking || showColdStartPrompt || !bubbleVisible) return undefined;
    if (bubbleHideTimerRef.current) window.clearTimeout(bubbleHideTimerRef.current);
    bubbleHideTimerRef.current = window.setTimeout(() => setBubbleVisible(false), 900);
    return () => window.clearTimeout(bubbleHideTimerRef.current);
  }, [isThinking, isListening, isSpeaking, showColdStartPrompt, bubbleVisible, bubbleText]);

  useEffect(() => {
    if (!shepEnabled) {
      setOrbSignal('red');
      return;
    }
    if (isThinking || isListening || isSpeaking) {
      setOrbSignal('amber');
      return;
    }
    if (orbSignal !== 'red') {
      setOrbSignal('green');
    }
  }, [shepEnabled, isThinking, isListening, isSpeaking, orbSignal]);

  useEffect(() => {
    setSessionId(`cali_${Math.random().toString(36).slice(2, 11)}`);
    roamTargetRef.current = pickRoamTarget(cursorPositionRef.current);
  }, []);

  const markVoiceUnavailable = () => {
    if (!shepEnabled) return;
    window.speechSynthesis?.cancel?.();
    setIsSpeaking(false);
    setShowVoiceRecovery(true);
    setAudioEngine('voice_unavailable');
    setOrbSignal('red');
    setBubbleVisible(true);
  };

  const speakWithBrowser = (text) => new Promise((resolve, reject) => {
    if (!text || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') {
      reject(new Error('Browser speech synthesis is unavailable'));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices?.() || [];
    utterance.voice = voices.find((voice) => /en-US/i.test(voice.lang) && /male|david|guy|mark|daniel|george|alex|aaron|bruce|fred|ralph|reed|tom/i.test(`${voice.name} ${voice.voiceURI}`))
      || voices.find((voice) => /en-US/i.test(voice.lang))
      || null;
    utterance.rate = 0.96;
    utterance.pitch = 0.88;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      resolve();
    };
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      reject(event.error || new Error('Browser speech failed'));
    };
    window.speechSynthesis.speak(utterance);
  });

  const requestMicrophoneAccess = async () => {
    if (coldStartMicRequestedRef.current && micPermissionStatus === 'blocked') return false;
    coldStartMicRequestedRef.current = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermissionStatus('unsupported');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermissionStatus('granted');
      setVoiceEnabled(true);
      localStorage.setItem(VOICE_RECOGNITION_ENABLED_KEY, 'true');
      return true;
    } catch (_error) {
      setMicPermissionStatus('blocked');
      setBubbleText('Microphone permission is blocked. Approve microphone access in the browser to talk with Shep.');
      return false;
    }
  };

  const stopShepAudio = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch (_error) {
      // Ignore recognizer races.
    }
    try {
      window.speechSynthesis?.cancel?.();
    } catch (_error) {
      // Ignore browser speech errors.
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    try {
      mediaRecorderRef.current?.stop?.();
    } catch (_error) {
      // Ignore recorder races.
    }
    try {
      mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    } catch (_error) {
      // Ignore stream cleanup races.
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    setIsListening(false);
    setIsSpeaking(false);
    setIsThinking(false);
  };

  const setShepOverride = async (enabled, reason = '') => {
    stopShepAudio();
    setShepEnabled(enabled);
    localStorage.setItem(SHEP_ADMIN_OVERRIDE_KEY, enabled ? 'true' : 'false');
    setOrbSignal(enabled ? 'green' : 'red');
    setBubbleVisible(true);
    setBubbleText(
      enabled
        ? 'Shep admin override released. Voice and governed responses are available again.'
        : 'Shep is shut down by admin override. Voice, listening, and responses are paused.',
    );

    const token = localStorage.getItem('admin_token');
    if (!token || !location.pathname.startsWith('/admin')) return;
    try {
      await axios.post(
        `${apiBaseUrl}/orb/admin/override`,
        { enabled, reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (_error) {
      setBubbleText(
        enabled
          ? 'Shep resumed locally, but the backend override could not be updated.'
          : 'Shep stopped locally, but the backend override could not be updated.',
      );
    }
  };

  const showPingAtSelector = (selector) => {
    if (!selector) return;
    const element = document.querySelector(selector);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width + 20;
    const targetY = rect.top + (rect.height / 2) - (ORB_SIZE / 2);
    const nearTarget = clampOrbPosition(targetX, targetY);
    roamTargetRef.current = nearTarget;
    summonUntilRef.current = Date.now() + SUMMON_ACTIVE_MS;
    dormantRef.current = false;
    setPing({
      x: rect.left + (rect.width / 2),
      y: rect.top + (rect.height / 2),
    });
    if (pingClearTimerRef.current) window.clearTimeout(pingClearTimerRef.current);
    pingClearTimerRef.current = window.setTimeout(() => setPing(null), PING_VISIBLE_MS);
  };

  const routeAndPing = (target) => {
    if (!target) return;
    if (target.path !== location.pathname) {
      try {
        sessionStorage.setItem(NAV_HIGHLIGHT_KEY, JSON.stringify(target));
      } catch (_error) {
        // Non-blocking storage.
      }
      navigate(target.path);
      return;
    }
    showPingAtSelector(target.selector);
  };

  const handleMotionVoiceCommand = (message) => {
    const normalized = (message || '').trim().toLowerCase().replace(/[.!?]+$/g, '');
    const moveCommand = /^(?:shep[,:]?\s*)?(?:move|move away|go away|give me space)$/i.test(normalized);
    const comeCommand = /^(?:shep[,:]?\s*)?(?:come|come here|come over|come to me|whistle|whistle to come)$/i.test(normalized);
    if (!moveCommand && !comeCommand) return false;

    dormantRef.current = false;
    summonUntilRef.current = Date.now() + SUMMON_ACTIVE_MS;
    if (comeCommand) {
      const cursor = cursorPositionRef.current;
      cursorApproachUntilRef.current = Date.now() + SUMMON_ACTIVE_MS;
      const destination = clampOrbPosition(cursor.x + 34, cursor.y - (ORB_SIZE / 2));
      roamTargetRef.current = destination;
      setPing({ x: cursor.x, y: cursor.y });
      if (pingClearTimerRef.current) window.clearTimeout(pingClearTimerRef.current);
      pingClearTimerRef.current = window.setTimeout(() => setPing(null), PING_VISIBLE_MS);
      setBubbleText('Coming to you.');
    } else {
      roamTargetRef.current = pickRoamTarget(cursorPositionRef.current);
      setBubbleText('Moving out of your way.');
    }
    setBubbleVisible(true);
    setOrbSignal('green');
    return true;
  };

  const buildCognitiveContext = () => ({
    ui_mode: 'floating_orb_voice_only',
    route_path: window.location.pathname,
    assistant_name: SITE_ORB_NAME,
    system_core: SITE_ORB_CORE_NAME,
    orb_core: SITE_ORB_CORE_NAME,
    llm_model: PRIMARY_MODEL,
    primary_model: PRIMARY_MODEL,
    fallback_model: FALLBACK_MODEL,
    tts_engine: 'qwen-tts',
    stt_engine: 'faster-whisper',
    no_fallback: false,
    require_upstream_llm: false,
    governance_mode: 'strict',
    governance_doctrine: DOCTRINE_VERSION,
    governance_hash: DOCTRINE_FILE_HASH,
    doctrine_version: DOCTRINE_VERSION,
    doctrine_hash: DOCTRINE_FILE_HASH,
    doctrine_ratified: DOCTRINE_RATIFIED_DATE,
    doctrine_status: DOCTRINE_STATUS,
    doctrine_baseline_hash: DOCTRINE_BASELINE_HASH,
    renova_cognition_required: true,
    constitutional_governance_required: true,
    raw_input_contract: true,
    epistemic_lens_order: ['kant', 'locke', 'hume', 'spinoza', 'harmonizer', 'cali'],
    tribunal_required: true,
    ddr_thresholds: {
      healthy_gt: 0.8,
      caution_gt: 0.5,
      critical_lte: 0.5,
    },
    doctrine_compliance_required: true,
    skg_context: {
      shep_butch_handoff: readLocalJson('shep_butch_handoff'),
      butch_customer_context: readLocalJson('butch_customer_context'),
      shiloh_profile: readLocalJson('shiloh_butch_profile'),
    },
    runtime_awareness: {
      route_path: window.location.pathname,
      idle_ms: Date.now() - lastCursorMovementRef.current,
      voice_enabled: voiceEnabled,
      voice_output_enabled: voiceOutputEnabled,
      dormant: dormantRef.current,
      summon_active: Date.now() < summonUntilRef.current,
      autonomous_drift: !isDraggingRef.current && Date.now() >= manualControlPauseUntilRef.current,
      cursor_awareness: {
        has_cursor: true,
      },
    },
  });

  const triggerCali = async (message, options = {}) => {
    if (!sessionId || (isThinking && !options.allowWhileThinking)) return;
    if (!shepEnabled) {
      stopShepAudio();
      setBubbleVisible(true);
      setOrbSignal('red');
      setBubbleText('Shep is shut down by admin override.');
      return;
    }
    if (handleMotionVoiceCommand(message)) return;
    const token = localStorage.getItem('admin_token');
    const isAdminRoute = location.pathname.startsWith('/admin');
    const useAdminOrb = isAdminRoute && token;
    dormantRef.current = false;
    summonUntilRef.current = Date.now() + SUMMON_ACTIVE_MS;
    setIsThinking(true);
    setBubbleVisible(true);
    try {
      const response = await axios.post(
        `${apiBaseUrl}${useAdminOrb ? '/orb/chat' : '/orb/site-chat'}`,
        {
          message,
          session_id: sessionId,
          page_context: pageContext,
          context: {
            ...buildCognitiveContext(),
          },
        },
        useAdminOrb ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );

      const payload = response.data || {};
      if (payload.status === 'admin_shutdown' || payload.metadata?.admin_override) {
        stopShepAudio();
        setShepEnabled(false);
        localStorage.setItem(SHEP_ADMIN_OVERRIDE_KEY, 'false');
        setOrbSignal('red');
        setBubbleText(payload.response_text || 'Shep is shut down by admin override.');
        return;
      }
      let responseText = payload.response_text || payload.response || 'Shep is online.';
      if ((payload.intent || {}).type === 'morb_unavailable') {
        try {
          const explained = localStorage.getItem(SHEP_MORB_EXPLAINED_KEY) === 'true';
          if (!explained) {
            responseText = `${responseText} Morbs deploy in prime-number sets. Blue means research, red means diagnostics. They return green for success, amber for partial, and red for blocked or failed.`;
            localStorage.setItem(SHEP_MORB_EXPLAINED_KEY, 'true');
          }
        } catch (_error) {
          // Non-blocking storage.
        }
      }
      setBubbleText(responseText);
      setEvidencePointers(Array.isArray(payload.evidence) ? payload.evidence : []);
      setOrbSignal('green');
      const guidanceTarget = resolveToolNavTarget(payload.tool_calls, Boolean(useAdminOrb));
      if (guidanceTarget && !voiceOutputEnabled) routeAndPing(guidanceTarget);

      if (voiceOutputEnabled) {
        if (payload.audio_wav_base64) {
          if (options.pointerSelector) showPingAtSelector(options.pointerSelector);
          const audio = new Audio(`data:audio/wav;base64,${payload.audio_wav_base64}`);
          audio.volume = 1;
          audio.muted = false;
          audioRef.current = audio;
          audio.onplay = () => {
            setIsSpeaking(true);
            if (guidanceTarget) routeAndPing(guidanceTarget);
          };
          audio.onended = () => {
            setIsSpeaking(false);
            if (bubbleHideTimerRef.current) window.clearTimeout(bubbleHideTimerRef.current);
            bubbleHideTimerRef.current = window.setTimeout(() => setBubbleVisible(false), 1200);
            window.setTimeout(() => startVoiceListening(), 350);
          };
          try {
            setIsSpeaking(true);
            await audio.play();
            setAudioEngine(payload.audio_engine || 'qwen-tts');
            setShowVoiceRecovery(false);
          } catch (_error) {
            if (guidanceTarget) routeAndPing(guidanceTarget);
            setBubbleText('Click Shep once to enable his out-loud greeting. Your browser is waiting for permission to play audio.');
            markVoiceUnavailable();
          }
        } else {
          if (guidanceTarget) routeAndPing(guidanceTarget);
          try {
            await speakWithBrowser(responseText);
            setAudioEngine('browser-male-fallback');
            setShowVoiceRecovery(false);
          } catch (_error) {
            setAudioEngine('server-voice-unavailable');
            setShowVoiceRecovery(true);
          }
        }
      }
    } catch (error) {
      setOrbSignal('red');
      setBubbleText(
        error?.response?.status === 401
          ? 'Session expired. Please log in again.'
          : `${SITE_ORB_NAME} backend unavailable right now. Check local Ollama, Whisper, and TTS services in WSL.`,
      );
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    const acceptButchHandoff = (event) => {
      const handoff = event.detail || {};
      localStorage.setItem('shep_butch_handoff', JSON.stringify(handoff));
      setBubbleVisible(true);
      setBubbleText('Butch handed this to Shep. I have the question and his answer.');
      triggerCali(
        `Continue this handoff from Butch without asking the visitor to repeat anything. Original question: ${handoff.original_question || 'Products-page help'}. Butch answered: ${handoff.butch_answer || 'No answer supplied.'}`,
        { allowWhileThinking: true },
      );
    };
    window.addEventListener('butch-shep-handoff', acceptButchHandoff);
    return () => window.removeEventListener('butch-shep-handoff', acceptButchHandoff);
  }, [sessionId, shepEnabled]);

  const recordWithWhisper = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setBubbleText('WSL Whisper needs browser microphone recording support.');
      return false;
    }

    let stream;
    try {
      stopShepAudio();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (_error) {
      setMicPermissionStatus('blocked');
      setBubbleText('Microphone permission is blocked. Approve microphone access so Shep can hear you.');
      return false;
    }

    mediaStreamRef.current = stream;
    setMicPermissionStatus('granted');
    setVoiceEnabled(true);
    localStorage.setItem(VOICE_RECOGNITION_ENABLED_KEY, 'true');
    setIsListening(true);
    setOrbSignal('amber');
    setBubbleVisible(true);
    setBubbleText('Shep is listening through the local speech stack. Ask now.');

    const chunks = [];
    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
    ].find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
    let recorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (_error) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setIsListening(false);
      setBubbleText('This browser could not start microphone recording. Try Chrome or Edge and allow microphone access.');
      return false;
    }
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onerror = () => {
      setIsListening(false);
      setBubbleText('WSL Whisper hit a recording error. Try speaking again.');
    };
    recorder.onstop = async () => {
      if (recordingStopTimerRef.current) window.clearTimeout(recordingStopTimerRef.current);
      recordingStopTimerRef.current = null;
      setIsListening(false);
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;

      if (!chunks.length) {
        setBubbleText('I did not catch audio. Try speaking again.');
        return;
      }

      setIsThinking(true);
      setBubbleText('Shep is transcribing what it heard...');
      try {
        const audioBlob = new Blob(chunks, { type: mimeType || recorder.mimeType || 'application/octet-stream' });
        const formData = new FormData();
        const extension = (mimeType || recorder.mimeType).includes('mp4') ? 'mp4' : 'webm';
        formData.append('file', audioBlob, `shep-input.${extension}`);
        const response = await axios.post(`${apiBaseUrl}/orb/speech/transcribe`, formData, {
          timeout: 60000,
        });
        const transcript = (response.data?.transcript || '').trim();
        if (!transcript) {
          setBubbleText('The speech stack did not return words. Try speaking again.');
          return;
        }
        setBubbleText(`${response.data?.provider || 'speech'} heard: ${transcript}`);
        await triggerCali(transcript, { allowWhileThinking: true });
      } catch (error) {
        setOrbSignal('red');
        const detail = error?.response?.data?.detail;
        setBubbleText(
          typeof detail === 'string'
            ? detail
            : detail?.message || 'Shep speech input is unavailable. Check faster-whisper in WSL and try again.',
        );
      } finally {
        setIsThinking(false);
      }
    };

    recorder.start();
    recordingStopTimerRef.current = window.setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, VOICE_RECORDING_MAX_MS);
    return true;
  };

  const startVoiceListening = async () => {
    if (!shepEnabled) {
      stopShepAudio();
      setBubbleVisible(true);
      setOrbSignal('red');
      setBubbleText('Shep is shut down by admin override.');
      return false;
    }
    return recordWithWhisper();
  };

  useEffect(() => {
    if (!location.pathname.startsWith('/admin')) return undefined;
    const token = localStorage.getItem('admin_token');
    if (!token) return undefined;
    let cancelled = false;
    const refreshOverride = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/orb/admin/override`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const enabled = response.data?.enabled !== false;
        setShepEnabled(enabled);
        localStorage.setItem(SHEP_ADMIN_OVERRIDE_KEY, enabled ? 'true' : 'false');
        if (!enabled) {
          stopShepAudio();
          setOrbSignal('red');
        }
      } catch (_error) {
        // Keep local override if backend status cannot be read.
      }
    };
    refreshOverride();
    const timer = window.setInterval(refreshOverride, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl, location.pathname]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
      setVoiceSupported(true);
    }
    if (!SpeechRecognition) {
      if (!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder)) {
        setVoiceSupported(false);
      }
      return;
    }
    setVoiceSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .filter((res) => res.isFinal && res[0]?.transcript)
        .map((res) => res[0].transcript.trim())
        .join(' ')
        .trim();
      if (transcript) {
        dormantRef.current = false;
        setBubbleText('Shep heard you. Working on it...');
        triggerCali(transcript);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceEnabled(false);
        localStorage.setItem(VOICE_RECOGNITION_ENABLED_KEY, 'false');
        setBubbleText('Microphone permission blocked. Enable mic access for Shep voice input.');
      }
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (_error) {
        // Ignore.
      }
      recognitionRef.current = null;
    };
  }, [sessionId, shepEnabled]);

  useEffect(() => {
    const onMouseMove = (event) => {
      lastCursorMovementRef.current = Date.now();
      cursorPositionRef.current = { x: event.clientX, y: event.clientY };
      if (dormantRef.current) {
        dormantRef.current = false;
        summonUntilRef.current = Date.now() + SUMMON_ACTIVE_MS;
      }
    };
    const onClickWake = () => {
      lastCursorMovementRef.current = Date.now();
      if (dormantRef.current) {
        dormantRef.current = false;
        summonUntilRef.current = Date.now() + SUMMON_ACTIVE_MS;
      }
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('click', onClickWake, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClickWake);
    };
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
      const next = clampOrbPosition(
        event.clientX - dragOffsetRef.current.x,
        event.clientY - dragOffsetRef.current.y,
      );
      if (
        Math.abs(next.x - orbPositionRef.current.x) > 1
        || Math.abs(next.y - orbPositionRef.current.y) > 1
      ) {
        suppressClickRef.current = true;
      }
      orbPositionRef.current = next;
      setOrbPosition(next);
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
      if (isDraggingRef.current || isListening || isSpeaking) return;
      if (Date.now() < manualControlPauseUntilRef.current) return;

      const idleMs = Date.now() - lastCursorMovementRef.current;
      if (idleMs >= IDLE_SLEEP_AFTER_MS) dormantRef.current = false;

      const current = orbPositionRef.current;
      let next;
      {
        if (!roamTargetRef.current) roamTargetRef.current = pickRoamTarget(cursorPositionRef.current, current);
        const roamTarget = roamTargetRef.current;
        const dx = roamTarget.x - current.x;
        const dy = roamTarget.y - current.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 26 && !isThinking) {
          roamTargetRef.current = pickRoamTarget(cursorPositionRef.current, current);
        }
        const gliding = clampOrbPosition(
          current.x + (dx * ORB_GLIDE_FACTOR),
          current.y + (dy * ORB_GLIDE_FACTOR),
        );
        const cursor = cursorPositionRef.current;
        const centerX = gliding.x + (ORB_SIZE / 2);
        const centerY = gliding.y + (ORB_SIZE / 2);
        const cursorDx = centerX - cursor.x;
        const cursorDy = centerY - cursor.y;
        const cursorDistance = Math.hypot(cursorDx, cursorDy);

        const cursorApproachAllowed = Date.now() < cursorApproachUntilRef.current;
        if (!cursorApproachAllowed && cursorDistance > 0 && cursorDistance < CURSOR_COMFORT_RADIUS) {
          const overlapRatio = 1 - (cursorDistance / CURSOR_COMFORT_RADIUS);
          next = clampOrbPosition(
            gliding.x + ((cursorDx / cursorDistance) * CURSOR_NUDGE_LIMIT * overlapRatio),
            gliding.y + ((cursorDy / cursorDistance) * CURSOR_NUDGE_LIMIT * overlapRatio),
          );
          if (distanceFromCursor(roamTargetRef.current, cursor) < CURSOR_COMFORT_RADIUS) {
            roamTargetRef.current = pickRoamTarget(cursor, current);
          }
        } else {
          next = gliding;
        }
      }

      orbPositionRef.current = next;
      setOrbPosition(next);
      persistOrbPosition(next);
    }, AUTONOMOUS_DRIFT_INTERVAL_MS);
    return () => window.clearInterval(driftTimer);
  }, [isListening, isSpeaking, isThinking]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NAV_HIGHLIGHT_KEY);
      if (!raw) return;
      const target = JSON.parse(raw);
      if (!target || target.path !== location.pathname) return;
      sessionStorage.removeItem(NAV_HIGHLIGHT_KEY);
      window.setTimeout(() => showPingAtSelector(target.selector), 220);
    } catch (_error) {
      // Ignore malformed storage payloads.
    }
  }, [location.pathname]);

  useEffect(() => {
    return undefined;
  }, [sessionId, shepEnabled, voiceSupported, voiceEnabled, coldStartReady, isThinking, isSpeaking, isListening]);

  useEffect(() => {
    return () => {
      if (pingClearTimerRef.current) window.clearTimeout(pingClearTimerRef.current);
      if (bubbleHideTimerRef.current) window.clearTimeout(bubbleHideTimerRef.current);
      if (recordingStopTimerRef.current) window.clearTimeout(recordingStopTimerRef.current);
      window.speechSynthesis?.cancel?.();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const handleOrbPointerDown = (event) => {
    if (event.button !== 0) return;
    const rect = orbButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    suppressClickRef.current = false;
    dragOffsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleOrbClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    dormantRef.current = false;
    summonUntilRef.current = Date.now() + SUMMON_ACTIVE_MS;
    if (isListening && mediaRecorderRef.current?.state === 'recording') {
      setBubbleText('Shep is processing what it heard...');
      mediaRecorderRef.current.stop();
      return;
    }
    if (!shepEnabled) {
      stopShepAudio();
      setBubbleVisible(true);
      setOrbSignal('red');
      setBubbleText('Shep is shut down by admin override.');
      return;
    }
    if (showVoiceRecovery && audioRef.current) {
      const pendingAudio = audioRef.current;
      pendingAudio.volume = 1;
      pendingAudio.muted = false;
      setBubbleVisible(true);
      setIsSpeaking(true);
      pendingAudio.play()
        .then(() => {
          setShowVoiceRecovery(false);
          setOrbSignal('green');
        })
        .catch(() => {
          setIsSpeaking(false);
          setBubbleText('Browser audio is still blocked. Allow sound for this site, then click Shep again.');
        });
      return;
    }
    setBubbleVisible(true);
    startVoiceListening().then((started) => {
      if (!started) {
        setBubbleText('Approve microphone access so Shep can listen.');
      }
    });
  };

  const handleEnableVoiceOutput = () => {
    setVoiceOutputEnabled(true);
    setVoiceEnabled(true);
    localStorage.setItem(VOICE_OUTPUT_ENABLED_KEY, 'true');
    localStorage.setItem(VOICE_RECOGNITION_ENABLED_KEY, 'true');
    if (bubbleText) {
      markVoiceUnavailable();
      setShowVoiceRecovery(false);
    }
  };

  const openEvidencePointer = async (pointer) => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setBubbleText('Source details are available to an authenticated administrator.');
      return;
    }
    try {
      const response = await axios.get(`${apiBaseUrl}/orb/substrate/source`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          relative_path: pointer.relative_path,
          page_number: pointer.page_number,
          chunk_id: pointer.chunk_id,
        },
      });
      setSourcePreview({ pointer, content: response.data?.content || [] });
      setBubbleVisible(true);
    } catch (_error) {
      setBubbleText('That source could not be opened. It may be unavailable or outside your permissions.');
    }
  };

  useEffect(() => {
    if (!sessionId || !shepEnabled || coldStartGreetingDoneRef.current) return undefined;
    coldStartGreetingDoneRef.current = true;
    dormantRef.current = false;
    summonUntilRef.current = Date.now() + SUMMON_ACTIVE_MS;
    setBubbleText(COLD_START_GREETING_TEXT);
    setBubbleVisible(true);
    setShowColdStartPrompt(true);
    setOrbSignal('amber');
    setVoiceOutputEnabled(true);
    localStorage.setItem(VOICE_OUTPUT_ENABLED_KEY, 'true');
    const greetingAudio = new Audio(SHEP_CACHED_GREETING_URL);
    greetingAudio.preload = 'auto';
    greetingAudio.volume = 1;
    greetingAudio.muted = false;
    audioRef.current = greetingAudio;
    const playGreeting = () => {
      if (!greetingAudio.paused || greetingAudio.ended) return;
      showPingAtSelector('[data-testid="nav-brand"]');
      greetingAudio.play().then(() => {
        setIsSpeaking(true);
        setShowVoiceRecovery(false);
        setOrbSignal('green');
      }).catch(() => {
        setIsSpeaking(false);
      });
    };
    greetingAudio.onended = () => {
      setIsSpeaking(false);
      setBubbleVisible(false);
      window.setTimeout(() => startVoiceListening(), 350);
    };
    window.addEventListener('shep-audio-unlock', playGreeting);
    window.addEventListener('pointerdown', playGreeting, { capture: true, once: true });
    window.addEventListener('keydown', playGreeting, { capture: true, once: true });
    const greetingTimer = window.setTimeout(playGreeting, 350);
    const micTimer = window.setTimeout(() => {
      requestMicrophoneAccess();
      setColdStartReady(true);
    }, voiceOutputEnabled ? 5200 : 1800);
    const promptTimer = window.setTimeout(() => setShowColdStartPrompt(false), 9000);
    return () => {
      window.clearTimeout(micTimer);
      window.clearTimeout(promptTimer);
      window.clearTimeout(pointerTimer);
      window.clearTimeout(greetingTimer);
      window.removeEventListener('shep-audio-unlock', playGreeting);
      window.removeEventListener('pointerdown', playGreeting, { capture: true });
      window.removeEventListener('keydown', playGreeting, { capture: true });
    };
  }, [sessionId, shepEnabled, voiceOutputEnabled]);

  const palette = {
    core: '#b99567',
    coreDark: '#765634',
    glow: 'rgba(232,211,177,0.72)',
    ring: 'rgba(255,250,240,0.82)',
    bubbleBg: '#f7f3e7',
    bubbleBorder: '#d8c6a1',
    bubbleText: '#13361f',
  };

  const signalPalette = (() => {
    if (orbSignal === 'red') {
      return {
        core: '#7f1d1d',
        coreDark: '#450a0a',
        glow: 'rgba(239,68,68,0.82)',
        ring: 'rgba(254,202,202,0.78)',
      };
    }
    if (orbSignal === 'amber') {
      return {
        core: 'rgba(54,124,43,0.82)',
        coreDark: 'rgba(24,76,31,0.9)',
        glow: 'rgba(104,179,58,0.34)',
        ring: 'rgba(166,211,120,0.32)',
      };
    }
    return {
      core: 'rgba(202,169,123,0.82)',
      coreDark: 'rgba(112,79,45,0.88)',
      glow: 'rgba(242,224,194,0.68)',
      ring: 'rgba(255,252,244,0.78)',
    };
  })();

  const activityMode = !shepEnabled
    ? 'shutdown'
    : isThinking
      ? 'thinking'
      : isSpeaking
        ? 'speaking'
        : isListening
          ? 'listening'
          : 'idle';
  const isActiveMode = ['thinking', 'speaking', 'listening'].includes(activityMode);

  const shouldShowBubble = bubbleVisible;

  const orbStyle = {
    background: `
      radial-gradient(circle at 50% 44%, rgba(255,255,255,0.22) 0 9%, ${signalPalette.core} 10% 58%, ${signalPalette.coreDark} 100%)
    `,
    boxShadow: `0 0 ${isActiveMode ? 26 : 16}px ${isActiveMode ? 5 : 3}px ${signalPalette.glow}, 0 0 ${isActiveMode ? 52 : 34}px ${isActiveMode ? 9 : 5}px ${signalPalette.glow}, 0 20px 54px rgba(0,0,0,0.5)`,
    touchAction: 'none',
    userSelect: 'none',
  };

  return (
    <>
      <style>{`
        @keyframes shep-orb-flow-a {
          0% { transform: translate(-12%, -7%) rotate(-8deg) scale(1); opacity: 0.56; }
          33% { transform: translate(8%, 1%) rotate(22deg) scale(1.14); opacity: 0.86; }
          66% { transform: translate(-2%, 8%) rotate(48deg) scale(1.06); opacity: 0.7; }
          100% { transform: translate(-12%, -7%) rotate(-8deg) scale(1); opacity: 0.56; }
        }
        @keyframes shep-orb-flow-b {
          0% { transform: translate(10%, 8%) rotate(34deg) scale(1.04); opacity: 0.42; }
          35% { transform: translate(-8%, -6%) rotate(-18deg) scale(1.18); opacity: 0.8; }
          70% { transform: translate(2%, -10%) rotate(-42deg) scale(1.1); opacity: 0.62; }
          100% { transform: translate(10%, 8%) rotate(34deg) scale(1.04); opacity: 0.42; }
        }
        @keyframes shep-orb-flow-c {
          0% { transform: translate(-4%, 12%) rotate(-28deg) scale(0.98); opacity: 0.34; }
          40% { transform: translate(7%, -8%) rotate(18deg) scale(1.16); opacity: 0.7; }
          78% { transform: translate(-10%, -2%) rotate(52deg) scale(1.06); opacity: 0.52; }
          100% { transform: translate(-4%, 12%) rotate(-28deg) scale(0.98); opacity: 0.34; }
        }
        @keyframes shep-orb-flow-d {
          0% { transform: translate(4%, -12%) rotate(62deg) scale(0.94); opacity: 0.22; }
          45% { transform: translate(-7%, 7%) rotate(18deg) scale(1.18); opacity: 0.58; }
          100% { transform: translate(4%, -12%) rotate(62deg) scale(0.94); opacity: 0.22; }
        }
        @keyframes shep-orb-shell {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.1) saturate(1.2); }
        }
        @keyframes cali-orb-splash-in {
          0% { transform: scale(0.08); opacity: 0; filter: blur(18px) brightness(2.2); }
          38% { transform: scale(1.22); opacity: 0.82; filter: blur(2px) brightness(1.35); }
          66% { transform: scale(0.92); opacity: 0.92; filter: blur(0) brightness(1.06); }
          100% { transform: scale(1); opacity: 1; filter: blur(0) brightness(1); }
        }
        @keyframes cali-orb-ring-pulse {
          0% { transform: scale(0.84); opacity: 0; }
          18% { opacity: 0.74; }
          100% { transform: scale(1.34); opacity: 0; }
        }
        @keyframes shep-speaking-glow {
          0%, 100% { transform: scale(0.98); opacity: 0.18; }
          45% { transform: scale(1.08); opacity: 0.38; }
        }
        @keyframes shep-nav-ping-expand {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(1.45); opacity: 0; }
        }
        .shep-nav-ping-core {
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 0 24px rgba(34, 197, 94, 0.92);
          transform: translate(-50%, -50%);
        }
        .shep-nav-ping-ring {
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 2px solid rgba(34, 197, 94, 0.95);
          animation: shep-nav-ping-expand 1.2s ease-out 2;
          transform: translate(-50%, -50%);
        }
      `}</style>

      {shouldShowBubble && (
        <div
          className="fixed z-[68] w-[min(320px,78vw)]"
          style={{
            left: `${orbPosition.x + ORB_SIZE - 6}px`,
            top: `${Math.max(EDGE_PADDING, orbPosition.y - 92)}px`,
          }}
        >
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
              {SITE_ORB_NAME}
            </div>
            <p className="text-sm leading-relaxed">
              {isThinking ? (
                <span className="inline-flex items-center" aria-label="Shep is thinking">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </span>
              ) : (
                bubbleText
              )}
            </p>
            <p className="mt-2 text-[11px] opacity-70">
              {!shepEnabled
                ? 'Admin override active'
                : micPermissionStatus === 'blocked'
                  ? 'Microphone blocked'
                  : micPermissionStatus === 'granted'
                    ? (isListening ? 'Listening...' : 'Microphone ready')
                    : voiceEnabled
                      ? (isListening ? 'Listening...' : 'Voice ready')
                      : 'Voice input disabled'}
            </p>
            {location.pathname.startsWith('/admin') && (
              <button
                type="button"
                onClick={() => setShepOverride(!shepEnabled, shepEnabled ? 'admin_manual_shutdown' : 'admin_manual_resume')}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                style={{ borderColor: shepEnabled ? '#7f1d1d' : palette.bubbleBorder, color: shepEnabled ? '#7f1d1d' : palette.core }}
              >
                <Power className="h-3 w-3" />
                {shepEnabled ? 'Shut Shep Down' : 'Resume Shep'}
              </button>
            )}
            {showVoiceRecovery && (
              <button
                type="button"
                onClick={handleEnableVoiceOutput}
                className="mt-2 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                style={{ borderColor: palette.bubbleBorder, color: palette.core }}
              >
                Enable Voice Output
              </button>
            )}
            {evidencePointers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-2" style={{ borderColor: palette.bubbleBorder }}>
                {evidencePointers.slice(0, 4).map((pointer) => (
                  <button
                    type="button"
                    key={pointer.source_id}
                    onClick={() => openEvidencePointer(pointer)}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                    style={{ borderColor: palette.bubbleBorder, color: palette.core }}
                  >
                    {pointer.source_type === 'ocr' ? 'OCR source' : pointer.page_number ? `Page ${pointer.page_number}` : 'View source'}
                  </button>
                ))}
              </div>
            )}
            {sourcePreview && (
              <div className="mt-3 max-h-48 overflow-y-auto rounded-xl bg-white/70 p-3 text-xs leading-relaxed">
                <div className="mb-1 flex items-center justify-between gap-2 font-semibold">
                  <span>{sourcePreview.pointer.display_name}</span>
                  <button type="button" onClick={() => setSourcePreview(null)} aria-label="Close source preview">×</button>
                </div>
                {sourcePreview.content.map((chunk) => <p key={chunk.chunk_id} className="mb-2 whitespace-pre-wrap">{chunk.text}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {ping && (
        <div
          className="pointer-events-none fixed z-[69]"
          style={{ left: `${ping.x}px`, top: `${ping.y}px`, transform: 'translate(-50%, -50%)' }}
        >
          <span className="shep-nav-ping-core" />
          <span className="shep-nav-ping-ring" />
        </div>
      )}

      <div
        className="pointer-events-auto fixed z-[70]"
        style={{
          left: `${orbPosition.x}px`,
          top: `${orbPosition.y}px`,
          transition: isDragging ? 'none' : 'left 180ms linear, top 180ms linear, opacity 0.6s ease, filter 0.6s ease',
          opacity: 1,
          filter: dormantRef.current ? 'saturate(0.82) brightness(0.92)' : 'none',
          animation: 'cali-orb-splash-in 2.2s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        <span
          className="pointer-events-none absolute rounded-full border-2"
          style={{ inset: '-1px', borderColor: 'rgba(202,169,123,0.9)', boxShadow: '0 0 18px rgba(202,169,123,0.58)', animation: 'cali-orb-ring-pulse 2.8s ease-out infinite' }}
        />
        <span
          className="pointer-events-none absolute rounded-full border"
          style={{ inset: '-1px', borderColor: 'rgba(255,255,255,0.9)', boxShadow: '0 0 15px rgba(255,255,255,0.55)', animation: 'cali-orb-ring-pulse 2.8s ease-out 0.7s infinite' }}
        />
        <span
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: '-10px',
            background: `radial-gradient(circle, ${signalPalette.glow} 0 44%, transparent 72%)`,
            opacity: isSpeaking ? 0.64 : isActiveMode ? 0.68 : 0.1,
            filter: 'blur(10px)',
            animation: isSpeaking ? 'shep-speaking-glow 0.84s ease-in-out infinite' : 'none',
          }}
        />
        <button
          ref={orbButtonRef}
          type="button"
          onPointerDown={handleOrbPointerDown}
          onClick={handleOrbClick}
          className={`relative flex h-[184px] w-[184px] items-center justify-center overflow-hidden rounded-full transition-all duration-500 hover:scale-105 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={orbStyle}
          aria-label="Summon Shep"
          title={shepEnabled ? 'Summon Shep' : 'Shep is shut down by admin override'}
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              backgroundImage: `url(${SHEP_ORB_SKIN_URL})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 1,
              filter: !shepEnabled
                ? 'saturate(0.35) brightness(0.58)'
                : isActiveMode
                  ? 'saturate(1.14) contrast(1.34) brightness(0.82) drop-shadow(0 3px 4px rgba(20,12,5,0.72))'
                  : 'saturate(1.12) contrast(1.38) brightness(0.78) drop-shadow(0 3px 5px rgba(20,12,5,0.78))',
              transform: isActiveMode ? 'scale(1.02)' : 'scale(1)',
              transition: 'filter 300ms ease, transform 300ms ease',
            }}
          />
          {isThinking && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#0a3c24] bg-[#22c55e] text-[#052e16]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
          )}
          {voiceEnabled ? (
            <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#0a3c24] bg-[#0f5132] text-white">
              <Mic className="h-3 w-3" />
            </span>
          ) : (
            <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#0a3c24] bg-[#7d4c22] text-white">
              <MicOff className="h-3 w-3" />
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export default AdminCaliOrbBubble;
