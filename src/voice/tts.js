// Browser speechSynthesis wrapper with sentence-streaming support.
//
// Two entry points:
//   speak(text)            — speak a complete chunk (used for short final flushes)
//   createStreamingSpeaker — returns { push(textSoFar), end(), cancel() }
//                            push() is called repeatedly with the full text streamed
//                            so far. The speaker queues each completed sentence to
//                            speechSynthesis as soon as it's detected.

let voicesCache = null;

function getVoices() {
  if (!window.speechSynthesis) return [];
  if (voicesCache && voicesCache.length) return voicesCache;
  voicesCache = window.speechSynthesis.getVoices() || [];
  return voicesCache;
}

// Some browsers (Chrome) populate voices asynchronously. Refresh on the event.
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices() || [];
  };
}

function pickPreferredVoice() {
  const voices = getVoices();
  if (!voices.length) return null;
  // Priority: Google > Natural > Premium > Microsoft Neural > English fallback
  const tiers = [
    (v) => /Google.*UK English Female/i.test(v.name),
    (v) => /Google.*UK English Male/i.test(v.name),
    (v) => /Google.*US English/i.test(v.name),
    (v) => /Google/i.test(v.name) && v.lang?.startsWith('en'),
    (v) => /Natural/i.test(v.name) && v.lang?.startsWith('en'),
    (v) => /Premium/i.test(v.name) && v.lang?.startsWith('en'),
    (v) => /Microsoft.*(Aria|Jenny|Guy|Davis|Natural|Neural)/i.test(v.name),
    (v) => /Samantha|Karen|Daniel|Moira/i.test(v.name),
    (v) => v.lang?.startsWith('en')
  ];
  for (const tier of tiers) {
    const hit = voices.find(tier);
    if (hit) return hit;
  }
  return voices[0] || null;
}

function makeUtterance(text, onEnd) {
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  utt.pitch = 1;
  const v = pickPreferredVoice();
  if (v) utt.voice = v;
  if (onEnd) {
    utt.onend = onEnd;
    utt.onerror = onEnd;
  }
  return utt;
}

export function speak(text, { onEnd } = {}) {
  if (!text || !window.speechSynthesis) return;
  cancel();
  window.speechSynthesis.speak(makeUtterance(text, onEnd));
}

export function cancel() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

export function isSpeaking() {
  return !!window.speechSynthesis?.speaking;
}

// Sentence boundary: . ! ? followed by whitespace or end of string.
// Captures the punctuation so we keep it on the spoken sentence.
const SENTENCE_RE = /([^.!?]+[.!?]+)(?=\s|$)/g;

// Streaming speaker. Call push(currentFullText) repeatedly. Each call extracts
// any newly-completed sentences and queues them to speechSynthesis.
export function createStreamingSpeaker({ onAllDone } = {}) {
  let cursor = 0; // index into the latest text we've already consumed
  let queued = 0;
  let finishedQueueing = false;
  let stopped = false;

  const checkDone = () => {
    if (finishedQueueing && queued === 0 && !stopped) {
      stopped = true;
      onAllDone?.();
    }
  };

  const flush = (fullText) => {
    if (stopped || !window.speechSynthesis) return;
    const remaining = fullText.slice(cursor);
    let m;
    let lastEnd = 0;
    SENTENCE_RE.lastIndex = 0;
    while ((m = SENTENCE_RE.exec(remaining)) !== null) {
      const sentence = m[1].trim();
      lastEnd = m.index + m[0].length;
      if (sentence) {
        queued++;
        const utt = makeUtterance(sentence, () => {
          queued--;
          checkDone();
        });
        window.speechSynthesis.speak(utt);
      }
    }
    if (lastEnd > 0) cursor += lastEnd;
  };

  return {
    push(fullText) {
      flush(fullText);
    },
    end(fullText) {
      // Flush any final sentence even if it lacks terminal punctuation.
      if (stopped) return;
      if (typeof fullText === 'string') flush(fullText);
      const tail = (fullText || '').slice(cursor).trim();
      if (tail) {
        queued++;
        const utt = makeUtterance(tail, () => {
          queued--;
          checkDone();
        });
        window.speechSynthesis.speak(utt);
        cursor += tail.length;
      }
      finishedQueueing = true;
      checkDone();
    },
    cancel() {
      stopped = true;
      cancel();
    }
  };
}
