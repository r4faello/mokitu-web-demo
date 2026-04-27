import { useEffect, useRef, useState, useCallback } from 'react';

// Web Speech API wrapper. Returns null `available` if browser doesn't support it.
// Callbacks are read from refs so the recognizer is built once per mount,
// not torn down every time the parent re-renders with new closures.
export default function useSpeechRecognition({ onResult, onError } = {}) {
  const SR =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  const available = !!SR;

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    r.maxAlternatives = 1;

    r.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((res) => res[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) onResultRef.current?.(transcript);
    };
    r.onerror = (e) => {
      onErrorRef.current?.(e.error || 'recognition_error');
      setListening(false);
    };
    r.onend = () => setListening(false);

    recognitionRef.current = r;
    return () => {
      try {
        r.abort();
      } catch (_) {}
      recognitionRef.current = null;
    };
  }, [SR]);

  const start = useCallback(() => {
    const r = recognitionRef.current;
    if (!r || listening) return;
    try {
      r.start();
      setListening(true);
    } catch (e) {
      onErrorRef.current?.(e?.message || 'start_failed');
    }
  }, [listening]);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch (_) {}
    setListening(false);
  }, []);

  return { available, listening, start, stop };
}
