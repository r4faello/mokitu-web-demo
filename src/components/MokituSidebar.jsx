import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PulseRing from './PulseRing.jsx';
import ScreenIndicator from './ScreenIndicator.jsx';
import MessageBubble from './MessageBubble.jsx';
import MessageInput from './MessageInput.jsx';
import SuggestionChips from './SuggestionChips.jsx';
import useSpeechRecognition from '../voice/useSpeechRecognition.js';
import * as tts from '../voice/tts.js';
import { matchElements } from '../elementMaps.js';
import { SCENARIO_BY_ID } from '../scenarios.js';
import { playResponseChime } from '../sounds.js';

const ACCENT = 'oklch(0.82 0.12 30)';
const ACCENT_DARK = 'oklch(0.72 0.14 30)';
const RADIUS = 14;

// Temporarily disabled — highlights need recalibration once real screenshots
// are placed and percentages are re-measured against them.
const HIGHLIGHTS_ENABLED = false;

// Word-pacing for natural streaming: shorter words flow faster, punctuation breathes.
const SHORT_WORDS = new Set([
  'a', 'an', 'the', 'is', 'in', 'on', 'at', 'to', 'of', 'and', 'or', 'so', 'as', 'if', 'be', 'it'
]);
function delayForWord(word) {
  const trimmed = word.trim();
  if (!trimmed) return 8;
  const last = trimmed[trimmed.length - 1];
  if (last === '.' || last === '!' || last === '?') return 150;
  if (last === ',' || last === ';' || last === ':') return 80;
  const lower = trimmed.toLowerCase();
  if (SHORT_WORDS.has(lower) || trimmed.length <= 3) return 20;
  return 30;
}

const COLORS = {
  bg: 'rgba(255, 248, 240, 0.95)',
  bgSolid: '#FFF8F0',
  headerBg: 'rgba(255, 243, 232, 0.96)',
  mokituBubbleFrom: '#FFFAF5',
  mokituBubbleTo: '#FFF5ED',
  userBubbleFrom: '#FFE4D4',
  userBubbleTo: '#FFD9C8',
  text: '#3D3028',
  textMuted: '#8C7B6B',
  accent: ACCENT,
  accentDark: ACCENT_DARK,
  sage: '#B8C9A3',
  pink: '#FFD5CC',
  peachLight: '#FFE4D4',
  screenBadgeBg: 'rgba(184, 201, 163, 0.2)',
  inputBg: 'rgba(255, 245, 237, 0.95)',
  shadow: '0 8px 40px rgba(61, 48, 40, 0.12)'
};

const ERROR_COPY = {
  network: "I had trouble reaching the network — try again in a moment.",
  server: "Mokitu is being set up — please check back soon.",
  unknown: "I had trouble thinking about that — try asking again.",
  voice: "I couldn't hear that — try speaking louder or use the text input."
};

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || `id-${Date.now()}-${Math.random()}`;
}

async function fetchAskWithRetry(payload, signal) {
  const doFetch = () =>
    fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });
  try {
    return await doFetch();
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    // One silent retry on network errors
    await new Promise((r) => setTimeout(r, 600));
    return doFetch();
  }
}

export default function MokituSidebar({ scenario, onHighlightUpdate }) {
  const config = SCENARIO_BY_ID[scenario];

  const [messages, setMessages] = useState(() => [
    { id: uid(), role: 'mokitu', text: config?.welcome || '', welcome: true }
  ]);
  const [appState, setAppState] = useState('idle');
  const [statusHint, setStatusHint] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [newMsgIdx, setNewMsgIdx] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const chatRef = useRef(null);
  const streamAbortRef = useRef(null);
  const fetchAbortRef = useRef(null);
  const streamingSpeakerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const sendMessage = useCallback(
    async (text, voice = false) => {
      if (!text || appState === 'thinking' || appState === 'streaming') return;

      // Hide suggestion chips once user has actually engaged
      setShowSuggestions(false);

      // Cancel any in-flight stream, fetch, TTS, highlights
      if (streamAbortRef.current) streamAbortRef.current.aborted = true;
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      if (streamingSpeakerRef.current) streamingSpeakerRef.current.cancel();
      tts.cancel();
      setSpeaking(false);
      onHighlightUpdate?.([]);

      const userMsg = { id: uid(), role: 'user', text, voice };
      const historyForRequest = messages.filter((m) => !m.welcome);
      setMessages((m) => {
        setNewMsgIdx(m.length);
        return [...m, userMsg];
      });
      setAppState('thinking');
      setStatusHint('');

      const ac = new AbortController();
      fetchAbortRef.current = ac;

      let responseText = '';
      try {
        const r = await fetchAskWithRetry(
          {
            message: text,
            scenario,
            conversationHistory: historyForRequest.map((m) => ({ role: m.role, text: m.text }))
          },
          ac.signal
        );
        if (!r.ok) {
          const code = r.status === 500 ? 'server' : 'unknown';
          throw new Error(code);
        }
        const data = await r.json();
        responseText = data.response || '';
      } catch (e) {
        if (e.name === 'AbortError' || !mountedRef.current) return;
        const code = ERROR_COPY[e.message] ? e.message : e.message === 'Failed to fetch' ? 'network' : 'unknown';
        const errMsg = ERROR_COPY[code] || ERROR_COPY.unknown;
        setMessages((m) => {
          setNewMsgIdx(m.length);
          return [...m, { id: uid(), role: 'mokitu', text: errMsg, error: true }];
        });
        setAppState('idle');
        return;
      } finally {
        if (fetchAbortRef.current === ac) fetchAbortRef.current = null;
      }

      if (!mountedRef.current) return;

      // Subtle "Mokitu is starting to respond" chime
      playResponseChime();

      const words = responseText.split(/(\s+)/).filter(Boolean);
      const bubbleId = uid();
      const abort = { aborted: false };
      streamAbortRef.current = abort;

      setMessages((m) => {
        setNewMsgIdx(m.length);
        return [...m, { id: bubbleId, role: 'mokitu', text: '', streaming: true }];
      });
      setAppState('streaming');
      setSpeaking(true);

      const speaker = tts.createStreamingSpeaker({
        onAllDone: () => {
          if (mountedRef.current) setSpeaking(false);
        }
      });
      streamingSpeakerRef.current = speaker;

      let acc = '';
      for (let i = 0; i < words.length; i++) {
        if (abort.aborted || !mountedRef.current) break;
        const word = words[i];
        acc += word;
        const current = acc;
        setMessages((m) => m.map((msg) => (msg.id === bubbleId ? { ...msg, text: current } : msg)));
        speaker.push(current);
        if (HIGHLIGHTS_ENABLED) {
          const matched = matchElements(scenario, current);
          if (matched.length) onHighlightUpdate?.(matched);
        }
        // Skip pacing on whitespace-only segments
        const delay = /^\s+$/.test(word) ? 8 : delayForWord(word);
        await new Promise((res) => setTimeout(res, delay));
      }

      if (!mountedRef.current) return;
      setMessages((m) => m.map((msg) => (msg.id === bubbleId ? { ...msg, streaming: false } : msg)));
      setAppState('idle');
      streamAbortRef.current = null;

      if (!abort.aborted && responseText) {
        speaker.end(acc);
      } else {
        speaker.cancel();
      }
    },
    [messages, appState, scenario, onHighlightUpdate]
  );

  const onSpeechResult = useCallback(
    (transcript) => {
      sendMessage(transcript, true);
    },
    [sendMessage]
  );
  const onSpeechError = useCallback((err) => {
    if (err === 'not-allowed') setStatusHint('Mic permission denied — enable it in your browser.');
    else if (err === 'no-speech') setStatusHint(ERROR_COPY.voice);
    else if (err !== 'aborted') setStatusHint(ERROR_COPY.voice);
  }, []);

  const speech = useSpeechRecognition({ onResult: onSpeechResult, onError: onSpeechError });

  const handleMicClick = useCallback(() => {
    if (!speech.available) return;
    if (speech.listening) {
      speech.stop();
      return;
    }
    if (speaking) {
      if (streamingSpeakerRef.current) streamingSpeakerRef.current.cancel();
      tts.cancel();
      setSpeaking(false);
    }
    setStatusHint('');
    speech.start();
  }, [speech, speaking]);

  // Auto-scroll
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount / scenario switch
  useEffect(
    () => () => {
      if (streamAbortRef.current) streamAbortRef.current.aborted = true;
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      if (streamingSpeakerRef.current) streamingSpeakerRef.current.cancel();
      tts.cancel();
    },
    []
  );

  const stateLabel = useMemo(() => {
    if (speech.listening) return 'Listening…';
    if (appState === 'thinking') return 'Thinking…';
    if (appState === 'streaming') return 'Responding…';
    if (speaking) return 'Speaking…';
    if (statusHint) return statusHint;
    if (!speech.available) return 'Type to ask Mokitu';
    return 'Tap to speak';
  }, [appState, speech.listening, speech.available, speaking, statusHint]);

  const micDisabled = !speech.available || appState === 'thinking' || appState === 'streaming';
  const showSuggestionsNow =
    showSuggestions && appState === 'idle' && messages.filter((m) => m.role === 'user').length === 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: COLORS.bg,
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        borderLeft: '1px solid rgba(255, 176, 136, 0.2)',
        boxShadow: COLORS.shadow,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Soft dot pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.025,
          pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle at 1px 1px, ${COLORS.text} 0.5px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: '20px 20px 16px',
          background: COLORS.headerBg,
          borderBottom: '1px solid rgba(61,48,40,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255, 140, 90, 0.25)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="9" cy="10" r="1.2" fill="#fff" />
              <circle cx="15" cy="10" r="1.2" fill="#fff" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: COLORS.text,
                fontFamily: "'Quicksand', sans-serif",
                letterSpacing: 1
              }}
            >
              Mokitu
            </div>
            <div
              style={{
                fontSize: 11,
                color: ACCENT_DARK,
                fontWeight: 300,
                fontFamily: "'Quicksand', sans-serif",
                marginTop: -1,
                letterSpacing: 0.4
              }}
            >
              Learning companion
            </div>
          </div>
        </div>
        <ScreenIndicator colors={COLORS} />
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          scrollBehavior: 'smooth',
          position: 'relative',
          zIndex: 1
        }}
      >
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id || i} msg={msg} colors={COLORS} radius={RADIUS} isNew={i === newMsgIdx} />
        ))}

        {showSuggestionsNow && config?.suggestions && (
          <SuggestionChips
            suggestions={config.suggestions}
            colors={COLORS}
            onPick={(text) => sendMessage(text, false)}
          />
        )}

        {appState === 'thinking' && <TypingDots colors={COLORS} radius={RADIUS} />}
      </div>

      {/* Bottom controls */}
      <div
        style={{
          padding: '12px 20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          position: 'relative',
          zIndex: 1,
          background: 'linear-gradient(transparent, rgba(255,248,240,0.7) 25%)'
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: COLORS.textMuted,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            textAlign: 'center',
            fontFamily: "'Quicksand', sans-serif"
          }}
        >
          {stateLabel}
        </span>

        {speaking && (
          <button
            onClick={() => {
              if (streamingSpeakerRef.current) streamingSpeakerRef.current.cancel();
              tts.cancel();
              setSpeaking(false);
            }}
            aria-label="Stop speaking"
            title="Stop speaking"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 20,
              border: '1px solid rgba(61,48,40,0.18)',
              background: 'rgba(255,248,240,0.9)',
              color: COLORS.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: 0.3
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="0" y="0" width="10" height="10" rx="1.5" />
            </svg>
            Stop speaking
          </button>
        )}

        <button
          onClick={handleMicClick}
          disabled={micDisabled}
          title={
            !speech.available
              ? 'Voice not supported in this browser — use text input'
              : speech.listening
              ? 'Stop recording'
              : 'Tap to speak'
          }
          style={{
            position: 'relative',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: speech.listening
              ? `linear-gradient(135deg, ${ACCENT_DARK}, ${ACCENT})`
              : `linear-gradient(135deg, ${ACCENT}, ${COLORS.pink})`,
            border: 'none',
            cursor: micDisabled ? 'default' : 'pointer',
            opacity: micDisabled && !speech.listening ? 0.45 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            transform: speech.listening ? 'scale(1.08)' : 'scale(1)',
            animation:
              !speech.listening && appState === 'idle' && !speaking
                ? 'micBreathe 3s ease-in-out infinite'
                : 'none',
            boxShadow: speech.listening
              ? '0 6px 28px rgba(255, 140, 90, 0.35)'
              : '0 4px 16px rgba(255, 140, 90, 0.18)'
          }}
          onMouseEnter={(e) => {
            if (!micDisabled && !speech.listening) e.currentTarget.style.transform = 'scale(1.06)';
          }}
          onMouseLeave={(e) => {
            if (!micDisabled && !speech.listening) e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <PulseRing active={speech.listening} color={ACCENT} />
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="1" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <line x1="8" y1="21" x2="16" y2="21" />
          </svg>
        </button>

        <MessageInput
          colors={COLORS}
          onSubmit={(text) => sendMessage(text, false)}
          disabled={appState === 'thinking' || appState === 'streaming'}
        />

        <div
          style={{
            fontSize: 10,
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 300,
            color: COLORS.textMuted,
            opacity: 0.65,
            letterSpacing: 0.4,
            marginTop: 2
          }}
        >
          Proof of concept — Red Bull Basement 2026
        </div>
      </div>
    </div>
  );
}

function TypingDots({ colors, radius }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.textMuted,
          marginBottom: 4,
          marginLeft: 4,
          fontFamily: "'Quicksand', sans-serif",
          letterSpacing: 0.3
        }}
      >
        Mokitu
      </span>
      <div
        style={{
          padding: '14px 18px',
          borderRadius: `${radius}px ${radius}px ${radius}px 4px`,
          background: `linear-gradient(135deg, ${colors.mokituBubbleFrom}, ${colors.mokituBubbleTo})`,
          display: 'flex',
          gap: 5,
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(61, 48, 40, 0.04)'
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: colors.accentDark,
              opacity: 0.45,
              animation: `typingDot 1.3s ${i * 0.18}s infinite ease-in-out`
            }}
          />
        ))}
      </div>
    </div>
  );
}
