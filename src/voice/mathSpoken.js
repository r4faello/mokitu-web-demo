// Converts LaTeX expressions to natural spoken English using speech-rule-engine.
// SRE expects MathML input; renderToMathmlString produces that from our existing
// LaTeX parser so we don't need an extra LaTeX→MathML dependency.

import { renderToMathmlString } from '../mathRender.js';

let sreReady = false;
let sreInstance = null;

export async function initSRE() {
  if (sreReady) return;
  try {
    const mod = await import('speech-rule-engine');
    sreInstance = mod.default;
    await sreInstance.setupEngine({
      domain: 'clearspeak',
      style: 'default',
      locale: 'en',
      modality: 'speech'
    });
    sreReady = true;
  } catch (e) {
    console.warn('[mathSpoken] SRE init failed — will use regex fallback', e);
  }
}

// Returns spoken text for a LaTeX expression, or null if SRE isn't ready yet.
export function latexToSpoken(expr) {
  if (!sreReady || !sreInstance) return null;
  try {
    const mathml = `<math>${renderToMathmlString(expr)}</math>`;
    return sreInstance.toSpeech(mathml) || null;
  } catch {
    return null;
  }
}
