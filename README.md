# Mokitu Web Demo

Web port of the Mokitu desktop AI tutor — built for the Red Bull Basement 2026 demo gallery on Replit.

The desktop app captures your live screen and sends it to Gemini with each question. This web demo swaps live capture for a static screenshot per scenario, but the AI conversation is fully real (Google Gemini 2.5 Flash).

## Local development

```bash
cp .env.example .env   # add your GEMINI_API_KEY
npm install
npm run build
npm start              # http://localhost:3000
```

For a hot-reload dev experience:

```bash
npm start              # in one terminal — Express on :3000
npm run dev            # in another — Vite on :5173, proxies /api to :3000
```

## Replit deployment

1. Import this folder as a Replit project (or push it to a GitHub repo and import that).
2. Add a Replit secret: `GEMINI_API_KEY = <your key>`.
3. Hit Run — `.replit` boots `npm start`, which builds and serves on port 3000.

## Adding the screenshots

Drop real PNG screenshots into `public/screenshots/`:

- `photoshop.png` — Photoshop with a portrait on the canvas
- `math.png` — A calculus problem (integral of x² · eˣ)
- `excel.png` — Excel with product codes + a lookup table

The `.txt` placeholders in that folder are just reminders — they aren't read at runtime. Until you add the PNGs the demo still works; it just shows a placeholder "desktop" panel and the AI responds without an image attached.

## Architecture

- **Frontend:** React + Vite. Components live in `src/components/`. The visual language is ported from the Electron renderer (Quicksand + Nunito, peach/cream/sage palette, soft shadows, 14px radius sidebar).
- **Backend:** Express in `server.js`. One endpoint: `POST /api/ask`. It loads the scenario screenshot, base64-encodes it, and sends it plus the user message + system prompt + conversation history to Gemini 2.5 Flash. The API key never leaves the server.
- **Voice:** Web Speech API for input, `speechSynthesis` for TTS. Both gracefully degrade — typing always works.

## Files

| Path | Purpose |
|------|---------|
| `server.js` | Express server, builds `dist/` if missing, exposes `/api/ask` |
| `src/systemPrompt.js` | Verbatim Mokitu system prompt + per-scenario context |
| `src/components/ScenarioSelector.jsx` | Landing page with three scenario cards |
| `src/components/DemoView.jsx` | Split layout: screenshot + sidebar |
| `src/components/MokituSidebar.jsx` | Conversation UI, mic button, streaming display |
| `src/voice/useSpeechRecognition.js` | Web Speech API hook |
| `src/voice/tts.js` | `speechSynthesis` wrapper |

## What's intentionally different from the desktop app

- No screen capture — single static screenshot per scenario.
- TTS uses the browser, not Azure/Piper.
- No `[HIGHLIGHT ...]` overlays. The system prompt's HIGHLIGHT instructions are stripped out (server also strips any tags Gemini emits).
- No settings panel, no API-key entry, no mic device picker. Demo gallery, not a configurable app.
