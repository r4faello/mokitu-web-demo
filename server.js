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

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equals = trimmed.indexOf('=');
    if (equals <= 0) continue;

    const key = trimmed.slice(0, equals).trim();
    let value = trimmed.slice(equals + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadLocalEnv();

const SCENARIOS = ['photoshop', 'math', 'excel'];
const MAX_CONTEXT_MESSAGES = 20;

// Azure OpenAI config — set these in .env:
//   AZURE_OPENAI_ENDPOINT  e.g. https://my-resource.openai.azure.com
//   AZURE_OPENAI_KEY       your Azure OpenAI API key
//   AZURE_OPENAI_DEPLOYMENT  e.g. gpt-4o
const API_VERSION = '2024-10-21';

if (!fs.existsSync(DIST_DIR)) {
  console.log('[server] No dist/ found — running build...');
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
}

function loadScreenshot(scenario) {
  const pngPath = path.join(SCREENSHOTS_DIR, `${scenario}.png`);
  if (!fs.existsSync(pngPath)) {
    return null;
  }
  const data = fs.readFileSync(pngPath).toString('base64');
  return { base64: data, mimeType: 'image/png' };
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

    const apiKey = process.env.AZURE_OPENAI_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '');
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    if (!apiKey || !azureEndpoint || !deployment) {
      return res.status(500).json({ error: 'Azure OpenAI not configured on server.' });
    }

    const screenshot = loadScreenshot(scenario);

    const historyMessages = trimHistory(conversationHistory).map((m) => ({
      role: m.role === 'mokitu' ? 'assistant' : 'user',
      content: m.text || ''
    }));

    // Build the final user message — multimodal if a screenshot is available
    const userContent = screenshot
      ? [
          { type: 'image_url', image_url: { url: `data:${screenshot.mimeType};base64,${screenshot.base64}` } },
          { type: 'text', text: message }
        ]
      : message;

    const body = {
      messages: [
        { role: 'system', content: buildSystemPrompt(scenario) },
        ...historyMessages,
        { role: 'user', content: userContent }
      ],
      max_tokens: 1024,
      temperature: 0.7
    };

    const url = `${azureEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${API_VERSION}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('[azure]', r.status, errText.slice(0, 300));
      return res.status(502).json({ error: `Azure OpenAI error ${r.status}` });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) return res.status(502).json({ error: 'Empty response from Azure OpenAI.' });

    // Strip [HIGHLIGHT ...] tags just in case the model emits them; preserve paragraph breaks for TTS pacing
    const clean = text.replace(/\[HIGHLIGHT\s+x:-?\d+\s+y:-?\d+\s+w:\d+\s+h:\d+\]/gi, '').trim();
    res.json({ response: clean });
  } catch (e) {
    console.error('[server] /api/ask failed:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/health', (_req, res) => {
  const hasKey = !!(process.env.AZURE_OPENAI_KEY && process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT);
  res.json({ ok: true, hasKey });
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
  if (!process.env.AZURE_OPENAI_KEY || !process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_DEPLOYMENT) {
    console.warn('[server] WARNING: AZURE_OPENAI_KEY / AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_DEPLOYMENT not fully set.');
  }
});
