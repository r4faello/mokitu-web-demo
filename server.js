import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { buildSystemPrompt } from './src/systemPrompt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');
const SCREENSHOTS_DIR = path.join(__dirname, 'public', 'screenshots');

const SCENARIOS = ['photoshop', 'math', 'excel'];
const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_CONTEXT_MESSAGES = 20;

if (!fs.existsSync(DIST_DIR)) {
  console.log('[server] No dist/ found — running build...');
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
}

const screenshotCache = new Map();
function loadScreenshot(scenario) {
  if (screenshotCache.has(scenario)) return screenshotCache.get(scenario);
  const pngPath = path.join(SCREENSHOTS_DIR, `${scenario}.png`);
  if (!fs.existsSync(pngPath)) {
    screenshotCache.set(scenario, null);
    return null;
  }
  const data = fs.readFileSync(pngPath).toString('base64');
  const result = { base64: data, mimeType: 'image/png' };
  screenshotCache.set(scenario, result);
  return result;
}

function trimHistory(history) {
  const clean = (history || []).filter((m) => !m.error);
  if (clean.length <= MAX_CONTEXT_MESSAGES) return clean;
  let start = clean.length - MAX_CONTEXT_MESSAGES;
  while (start < clean.length && clean[start].role !== 'user') start++;
  return clean.slice(start);
}

const app = express();
app.use(express.json({ limit: '4mb' }));

app.post('/api/ask', async (req, res) => {
  try {
    const { message, scenario, conversationHistory } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: 'message too long (4000 char max)' });
    }
    if (!SCENARIOS.includes(scenario)) {
      return res.status(400).json({ error: `scenario must be one of ${SCENARIOS.join(', ')}` });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server.' });
    }

    const screenshot = loadScreenshot(scenario);

    const historyParts = trimHistory(conversationHistory).map((m) => ({
      role: m.role === 'mokitu' ? 'model' : 'user',
      parts: [{ text: m.text || '' }]
    }));

    const userParts = [];
    if (screenshot) {
      userParts.push({
        inline_data: { mime_type: screenshot.mimeType, data: screenshot.base64 }
      });
    }
    userParts.push({ text: message });

    const body = {
      systemInstruction: { parts: [{ text: buildSystemPrompt(scenario) }] },
      contents: historyParts.concat([{ role: 'user', parts: userParts }])
    };

    const r = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('[gemini]', r.status, errText.slice(0, 300));
      return res.status(502).json({ error: `Gemini error ${r.status}` });
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (!text) return res.status(502).json({ error: 'Empty response from Gemini.' });

    // Strip [HIGHLIGHT ...] tags just in case the model emits them; preserve paragraph breaks for TTS pacing
    const clean = text.replace(/\[HIGHLIGHT\s+x:-?\d+\s+y:-?\d+\s+w:\d+\s+h:\d+\]/gi, '').trim();
    res.json({ response: clean });
  } catch (e) {
    console.error('[server] /api/ask failed:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasKey: !!process.env.GEMINI_API_KEY });
});

app.use(express.static(DIST_DIR));
app.use('/screenshots', express.static(SCREENSHOTS_DIR));

// Unknown API routes return JSON 404, not the SPA shell
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] Mokitu web demo listening on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[server] WARNING: GEMINI_API_KEY is not set — /api/ask will return 500.');
  }
});
