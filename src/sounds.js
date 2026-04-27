// Web Audio chime played when Mokitu starts responding.
// Two stacked sine tones with a fast envelope — felt, not heard.
// Wrapped to swallow any AudioContext construction or scheduling errors so
// audio failures never break the streaming UI.

let ctx = null;

function getCtx() {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function playResponseChime() {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});

    const now = c.currentTime;
    const tones = [
      { freq: 880, gain: 0.06, dur: 0.18 },
      { freq: 1320, gain: 0.04, dur: 0.14 }
    ];

    for (const t of tones) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.freq, now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(t.gain, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t.dur);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + t.dur + 0.02);
    }
  } catch {
    /* never let an audio failure break the response flow */
  }
}
