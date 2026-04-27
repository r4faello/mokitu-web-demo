// Pure math parsing helpers shared between visual rendering (MessageBubble) and TTS.

export function replaceLatexCommandWithGroup(text, command, replacement) {
  let result = '';
  let cursor = 0;
  const needle = `\\${command}{`;

  while (cursor < text.length) {
    const start = text.indexOf(needle, cursor);
    if (start === -1) {
      result += text.slice(cursor);
      break;
    }
    result += text.slice(cursor, start);
    let depth = 1;
    let end = start + needle.length;
    while (end < text.length && depth > 0) {
      if (text[end] === '{') depth++;
      if (text[end] === '}') depth--;
      end++;
    }
    const content = text.slice(start + needle.length, end - 1);
    result += replacement(content);
    cursor = end;
  }

  return result;
}

export function normalizeLatex(raw) {
  let text = String(raw ?? '').trim();

  if (text.startsWith('$') && text.endsWith('$')) text = text.slice(1, -1).trim();
  if (text.startsWith('\\(') && text.endsWith('\\)')) text = text.slice(2, -2).trim();
  if (text.startsWith('\\[') && text.endsWith('\\]')) text = text.slice(2, -2).trim();

  text = text
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\\to/g, '->')
    .replace(/\\rightarrow/g, '->')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\prime/g, "'")
    .replace(/\\lim_\{\s*([A-Za-z])\s*->\s*([^{}]+)\s*\}/g, 'lim ($1->$2)')
    .replace(/\\lim_\{\s*([A-Za-z])\s+to\s+([^{}]+)\s*\}/g, 'lim ($1->$2)')
    .replace(/\\lim/g, 'lim');

  text = replaceLatexCommandWithGroup(text, 'sqrt', (content) => `sqrt(${content})`);

  let previous = '';
  while (previous !== text) {
    previous = text;
    text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function stripOuterPair(value) {
  let text = value.trim();
  let changed = true;

  while (changed && text.length >= 2) {
    changed = false;
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
      if (text[0] !== open || text[text.length - 1] !== close) continue;
      let depth = 0;
      let wraps = true;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === open) depth++;
        if (text[i] === close) depth--;
        if (depth === 0 && i < text.length - 1) { wraps = false; break; }
      }
      if (wraps) { text = text.slice(1, -1).trim(); changed = true; }
    }
  }

  return text;
}

export function findTopLevelOperator(text, operators, fromRight = true) {
  let depth = 0;
  const start = fromRight ? text.length - 1 : 0;
  const end = fromRight ? -1 : text.length;
  const step = fromRight ? -1 : 1;

  for (let i = start; i !== end; i += step) {
    const ch = text[i];
    if (ch === ')' || ch === ']' || ch === '}') depth++;
    else if (ch === '(' || ch === '[' || ch === '{') depth--;
    else if (depth === 0 && operators.includes(ch)) {
      if ((ch === '+' || ch === '-') && (i === 0 || '+-*/=('.includes(text[i - 1]))) continue;
      return i;
    }
  }

  return -1;
}

export function splitTopLevelEquals(text) {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === '=' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }

  if (parts.length) parts.push(text.slice(start).trim());
  return parts;
}

export function parseLimit(text) {
  const match = /^lim\s*(?:_\{?\s*)?\(?\s*([A-Za-z])\s*(?:->|to|→)\s*([A-Za-z0-9]+)\s*\}?\)?\s*(.*)$/i.exec(text);
  if (!match) return null;
  return { variable: match[1], target: match[2], rest: match[3].trim() };
}

// Converts a normalized-LaTeX expression to a MathML string (no React/JSX).
// Mirrors renderMathExpression in MessageBubble.jsx but produces a plain string
// so it can be fed to speech-rule-engine.
export function renderToMathmlString(raw) {
  let text = normalizeLatex(raw);
  if (!text) return '<mrow/>';

  const equalsParts = splitTopLevelEquals(text);
  if (equalsParts.length > 1) {
    const inner = equalsParts
      .map((part, i) => (i > 0 ? '<mo>=</mo>' : '') + renderToMathmlString(part))
      .join('');
    return `<mrow>${inner}</mrow>`;
  }

  const limit = parseLimit(text);
  if (limit) {
    return (
      `<mrow><msub><mo>lim</mo><mrow><mi>${limit.variable}</mi><mo>&#x2192;</mo>` +
      `${renderToMathmlString(limit.target)}</mrow></msub>` +
      `${limit.rest ? renderToMathmlString(stripOuterPair(limit.rest)) : ''}</mrow>`
    );
  }

  text = stripOuterPair(text);

  const addIndex = findTopLevelOperator(text, ['+', '-']);
  if (addIndex > 0) {
    return (
      `<mrow>${renderToMathmlString(text.slice(0, addIndex))}` +
      `<mo>${text[addIndex]}</mo>` +
      `${renderToMathmlString(text.slice(addIndex + 1))}</mrow>`
    );
  }

  const slashIndex = findTopLevelOperator(text, ['/'], false);
  if (slashIndex > 0) {
    return (
      `<mfrac>${renderToMathmlString(text.slice(0, slashIndex))}` +
      `${renderToMathmlString(text.slice(slashIndex + 1))}</mfrac>`
    );
  }

  const powerIndex = findTopLevelOperator(text, ['^']);
  if (powerIndex > 0) {
    return (
      `<msup>${renderToMathmlString(text.slice(0, powerIndex))}` +
      `${renderToMathmlString(text.slice(powerIndex + 1))}</msup>`
    );
  }

  const sqrtMatch = /^sqrt\((.*)\)$/i.exec(text);
  if (sqrtMatch) return `<msqrt>${renderToMathmlString(sqrtMatch[1])}</msqrt>`;

  const functionMatch = /^([A-Za-z])('?)\((.*)\)$/.exec(text);
  if (functionMatch) {
    return (
      `<mrow><mi>${functionMatch[1]}</mi>` +
      `${functionMatch[2] ? '<mo>&#x2032;</mo>' : ''}` +
      `<mo>(</mo>${renderToMathmlString(functionMatch[3])}<mo>)</mo></mrow>`
    );
  }

  if (/^\d+(?:\.\d+)?$/.test(text)) return `<mn>${text}</mn>`;
  if (/^[A-Za-z]+$/.test(text)) return `<mi>${text}</mi>`;

  const tokens = text.match(/[A-Za-z]+|\d+(?:\.\d+)?|->|→|[()+\-*/=]|'|,/g);
  if (!tokens) return `<mtext>${text}</mtext>`;

  return `<mrow>${tokens.map((token) => {
    if (/^\d/.test(token)) return `<mn>${token}</mn>`;
    if (/^[A-Za-z]+$/.test(token)) return `<mi>${token}</mi>`;
    if (token === '->' || token === '→') return `<mo>&#x2192;</mo>`;
    if (token === "'") return `<mo>&#x2032;</mo>`;
    return `<mo>${token}</mo>`;
  }).join('')}</mrow>`;
}
