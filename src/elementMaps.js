// Element coordinate maps per scenario, used to highlight UI on the screenshot
// when Mokitu mentions a named element in its response.
//
// Coordinates are in PERCENTAGES of the rendered image (0–100), so they
// scale with the displayed size. Once real PNGs are dropped at
// public/screenshots/{scenario}.png, recalibrate the values below by
// inspecting the screenshots — these are educated guesses for typical
// Windows-app layouts at ~1920x1080.
//
// Keys are lowercase phrases. The matcher does a substring check against
// the streaming response (also lowercased), so "click the Select menu" will
// match the key "select menu". Keep keys short and unambiguous.

export const ELEMENT_MAPS = {
  photoshop: {
    'file menu':       { x: 0.5,  y: 1.5,  w: 4.0, h: 2.5 },
    'edit menu':       { x: 4.5,  y: 1.5,  w: 4.0, h: 2.5 },
    'image menu':      { x: 8.5,  y: 1.5,  w: 4.5, h: 2.5 },
    'layer menu':      { x: 13.0, y: 1.5,  w: 4.5, h: 2.5 },
    'select menu':     { x: 17.5, y: 1.5,  w: 5.0, h: 2.5 },
    'filter menu':     { x: 22.5, y: 1.5,  w: 4.5, h: 2.5 },
    'tools panel':     { x: 0.5,  y: 6.0,  w: 4.0, h: 80.0 },
    'layers panel':    { x: 78.0, y: 50.0, w: 21.5, h: 45.0 },
    'properties panel':{ x: 78.0, y: 6.0,  w: 21.5, h: 42.0 },
    'canvas':          { x: 6.0,  y: 6.0,  w: 70.0, h: 86.0 },
    'options bar':     { x: 5.0,  y: 4.0,  w: 72.0, h: 3.0 },
    'taskbar':         { x: 0.0,  y: 96.0, w: 100.0, h: 4.0 }
  },
  math: {
    'integral':        { x: 25.0, y: 30.0, w: 50.0, h: 14.0 },
    'equation':        { x: 25.0, y: 30.0, w: 50.0, h: 14.0 },
    'problem':         { x: 25.0, y: 30.0, w: 50.0, h: 14.0 },
    'work area':       { x: 10.0, y: 50.0, w: 80.0, h: 38.0 },
    'taskbar':         { x: 0.0,  y: 96.0, w: 100.0, h: 4.0 }
  },
  excel: {
    'formula bar':     { x: 5.0,  y: 7.0,  w: 90.0, h: 3.0 },
    'cell':            { x: 5.0,  y: 11.0, w: 60.0, h: 4.0 },
    'product codes':   { x: 5.0,  y: 14.0, w: 30.0, h: 60.0 },
    'lookup table':    { x: 38.0, y: 14.0, w: 30.0, h: 60.0 },
    'ribbon':          { x: 0.0,  y: 0.5,  w: 100.0, h: 6.5 },
    'home tab':        { x: 8.0,  y: 1.0,  w: 5.0, h: 2.5 },
    'formulas tab':    { x: 26.0, y: 1.0,  w: 6.5, h: 2.5 },
    'data tab':        { x: 32.5, y: 1.0,  w: 4.5, h: 2.5 },
    'taskbar':         { x: 0.0,  y: 96.0, w: 100.0, h: 4.0 }
  }
};

// Aliases collapse natural-language variations onto canonical keys.
// Example: "the Layers panel", "layers window", "layers" all point to "layers panel".
export const ALIASES = {
  photoshop: {
    layers: 'layers panel',
    tools: 'tools panel',
    properties: 'properties panel',
    file: 'file menu',
    edit: 'edit menu',
    image: 'image menu',
    layer: 'layer menu',
    select: 'select menu',
    filter: 'filter menu'
  },
  math: {
    'x squared': 'integral',
    'x^2': 'integral'
  },
  excel: {
    formulas: 'formulas tab',
    home: 'home tab',
    data: 'data tab',
    'product code': 'product codes'
  }
};

// Find all element keys mentioned in `text`. Returns canonical map keys.
export function matchElements(scenario, text) {
  const map = ELEMENT_MAPS[scenario];
  const aliases = ALIASES[scenario] || {};
  if (!map || !text) return [];
  const lower = text.toLowerCase();
  const matches = new Set();

  // Direct key matches (longest first so "layers panel" wins over "layers")
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (lower.includes(k)) matches.add(k);
  }

  // Alias matches — only adopt if the canonical key wasn't already matched
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (matches.has(canonical)) continue;
    // Word-boundary check so "layer" doesn't match inside "player"
    const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(lower)) matches.add(canonical);
  }
  return [...matches];
}
