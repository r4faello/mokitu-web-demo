import { cloneElement, isValidElement } from 'react';

const MATHY_RE = /(=|\/|\^|sqrt\(|lim\b|->|\\frac|\\sqrt|\\lim|[a-zA-Z]'\()/;
const SPREADSHEET_FORMULA_RE =
  /(?:^|[\s:])=?\s*(?:VLOOKUP|XLOOKUP|HLOOKUP|INDEX|MATCH|SUMIF|COUNTIF|IFERROR|IF|SUM|AVERAGE|COUNT)\s*\(|\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?/i;

function replaceLatexCommandWithGroup(text, command, replacement) {
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

function normalizeLatex(raw) {
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

function stripOuterPair(value) {
  let text = value.trim();
  let changed = true;

  while (changed && text.length >= 2) {
    changed = false;
    const pairs = [
      ['(', ')'],
      ['[', ']'],
      ['{', '}']
    ];

    for (const [open, close] of pairs) {
      if (text[0] !== open || text[text.length - 1] !== close) continue;
      let depth = 0;
      let wraps = true;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === open) depth++;
        if (text[i] === close) depth--;
        if (depth === 0 && i < text.length - 1) {
          wraps = false;
          break;
        }
      }
      if (wraps) {
        text = text.slice(1, -1).trim();
        changed = true;
      }
    }
  }

  return text;
}

function findTopLevelOperator(text, operators, fromRight = true) {
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

function splitTopLevelEquals(text) {
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

function parseLimit(text) {
  const match = /^lim\s*(?:_\{?\s*)?\(?\s*([A-Za-z])\s*(?:->|to|→)\s*([A-Za-z0-9]+)\s*\}?\)?\s*(.*)$/i.exec(text);
  if (!match) return null;
  return {
    variable: match[1],
    target: match[2],
    rest: match[3].trim()
  };
}

function mathChildren(children) {
  return children.flat().filter(Boolean).map((child, index) => {
    if (typeof child === 'string') return <mtext key={index}>{child}</mtext>;
    if (isValidElement(child)) return cloneElement(child, { key: index });
    return <mtext key={index}>{String(child)}</mtext>;
  });
}

function Row({ children }) {
  return <mrow>{mathChildren(Array.isArray(children) ? children : [children])}</mrow>;
}

function renderMathExpression(raw) {
  let text = normalizeLatex(raw);

  if (!text) return <mrow />;

  const equalsParts = splitTopLevelEquals(text);
  if (equalsParts.length > 1) {
    return (
      <Row>
        {equalsParts.map((part, index) => [
          index > 0 ? <mo>=</mo> : null,
          renderMathExpression(part)
        ])}
      </Row>
    );
  }

  const limit = parseLimit(text);
  if (limit) {
    return (
      <Row>
        <msub>
          <mo>lim</mo>
          <mrow>
            <mi>{limit.variable}</mi>
            <mo>&rarr;</mo>
            {renderMathExpression(limit.target)}
          </mrow>
        </msub>
        {limit.rest ? renderMathExpression(stripOuterPair(limit.rest)) : null}
      </Row>
    );
  }

  text = stripOuterPair(text);

  const addIndex = findTopLevelOperator(text, ['+', '-']);
  if (addIndex > 0) {
    return (
      <Row>
        {renderMathExpression(text.slice(0, addIndex))}
        <mo>{text[addIndex]}</mo>
        {renderMathExpression(text.slice(addIndex + 1))}
      </Row>
    );
  }

  const slashIndex = findTopLevelOperator(text, ['/'], false);
  if (slashIndex > 0) {
    return (
      <mfrac>
        {renderMathExpression(text.slice(0, slashIndex))}
        {renderMathExpression(text.slice(slashIndex + 1))}
      </mfrac>
    );
  }

  const powerIndex = findTopLevelOperator(text, ['^']);
  if (powerIndex > 0) {
    return (
      <msup>
        {renderMathExpression(text.slice(0, powerIndex))}
        {renderMathExpression(text.slice(powerIndex + 1))}
      </msup>
    );
  }

  const sqrtMatch = /^sqrt\((.*)\)$/i.exec(text);
  if (sqrtMatch) {
    return <msqrt>{renderMathExpression(sqrtMatch[1])}</msqrt>;
  }

  const functionMatch = /^([A-Za-z])('?)\((.*)\)$/.exec(text);
  if (functionMatch) {
    return (
      <Row>
        <mi>{functionMatch[1]}</mi>
        {functionMatch[2] ? <mo>&prime;</mo> : null}
        <mo>(</mo>
        {renderMathExpression(functionMatch[3])}
        <mo>)</mo>
      </Row>
    );
  }

  if (/^\d+(?:\.\d+)?$/.test(text)) return <mn>{text}</mn>;
  if (/^[A-Za-z]+$/.test(text)) return <mi>{text}</mi>;

  const tokens = text.match(/[A-Za-z]+|\d+(?:\.\d+)?|->|→|[()+\-*/=]|'|,/g);
  if (!tokens) return <mtext>{text}</mtext>;

  return (
    <Row>
      {tokens.map((token) => {
        if (/^\d/.test(token)) return <mn>{token}</mn>;
        if (/^[A-Za-z]+$/.test(token)) return <mi>{token}</mi>;
        if (token === '->' || token === '→') return <mo>&rarr;</mo>;
        if (token === "'") return <mo>&prime;</mo>;
        return <mo>{token}</mo>;
      })}
    </Row>
  );
}

function MathFormula({ expression, block = false }) {
  return (
    <math
      display={block ? 'block' : 'inline'}
      style={{
        fontSize: block ? 14.5 : 15,
        lineHeight: 1.35,
        maxWidth: '100%',
        overflow: 'visible',
        color: 'inherit'
      }}
    >
      {renderMathExpression(expression)}
    </math>
  );
}

function extractEquation(line) {
  const trimmed = line.trim();
  if (SPREADSHEET_FORMULA_RE.test(trimmed)) return null;

  if (/^EQ\s*:/i.test(trimmed)) {
    return { prefix: '', expression: trimmed.replace(/^EQ\s*:/i, '').trim() };
  }

  const displayMath = /^\$\$(.*)\$\$$/.exec(trimmed);
  if (displayMath) return { prefix: '', expression: displayMath[1].trim() };
  const bracketDisplayMath = /^\\\[(.*)\\\]$/.exec(trimmed);
  if (bracketDisplayMath) return { prefix: '', expression: bracketDisplayMath[1].trim() };

  if (!MATHY_RE.test(trimmed) || trimmed.length > 220 || /\$[^$]+\$/.test(trimmed)) return null;

  const colonIndex = trimmed.lastIndexOf(':');
  if (colonIndex >= 0 && MATHY_RE.test(trimmed.slice(colonIndex + 1))) {
    return {
      prefix: trimmed.slice(0, colonIndex + 1),
      expression: trimmed.slice(colonIndex + 1).replace(/[.]$/, '').trim()
    };
  }

  if (trimmed.includes('=')) return { prefix: '', expression: trimmed.replace(/[.]$/, '') };
  return null;
}

function renderInlineMath(text) {
  const parts = [];
  const pattern =
    /(\$[^$\n]+\$|\\\([^)]*\\\)|sqrt\([^()]+\)|\\sqrt\{[^{}]+\}|\\frac\{[^{}]+\}\{[^{}]+\}|\([^)]+\)\s*\/\s*\([^)]+\)|\b\d+\s*\/\s*\d+\b|\b[A-Za-z]\^\d+\b)/g;
  let last = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<MathFormula key={`math-${match.index}`} expression={match[0]} />);
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function FormattedMessageText({ text, voice, colors }) {
  const content = String(text ?? '');
  const lines = content.split('\n');
  const rendered = lines.map((line, index) => {
    const equation = extractEquation(line);

    if (equation) {
      return (
        <span key={index}>
          {equation.prefix ? <span>{renderInlineMath(equation.prefix)} </span> : null}
          <span
            style={{
              display: 'block',
              margin: '8px 0 10px',
              padding: '9px 8px',
              borderRadius: 10,
              background: 'rgba(255, 248, 240, 0.74)',
              border: '1px solid rgba(61, 48, 40, 0.08)',
              overflow: 'visible'
            }}
          >
            <MathFormula expression={equation.expression} block />
          </span>
          {index < lines.length - 1 ? <br /> : null}
        </span>
      );
    }

    return (
      <span key={index}>
        {renderInlineMath(line)}
        {index < lines.length - 1 ? <br /> : null}
      </span>
    );
  });

  if (voice) return <span style={{ fontStyle: 'italic', opacity: 0.85 }}>{rendered}</span>;
  return <span style={{ '--math-accent': colors?.accentDark }}>{rendered}</span>;
}

export default function MessageBubble({ msg, colors, radius, isNew }) {
  const isMokitu = msg.role === 'mokitu';
  const isError = msg.error === true;
  const errorBg = '#F7E3DD';
  const errorText = '#7A4A42';

  const bubbleBg = isError
    ? errorBg
    : isMokitu
    ? `linear-gradient(135deg, ${colors.mokituBubbleFrom}, ${colors.mokituBubbleTo})`
    : `linear-gradient(135deg, ${colors.userBubbleFrom}, ${colors.userBubbleTo})`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMokitu ? 'flex-start' : 'flex-end',
        animation: isNew ? 'bubbleSlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none'
      }}
    >
      {isMokitu && (
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
      )}
      <div
        style={{
          padding: '12px 16px',
          maxWidth: isMokitu ? '96%' : '88%',
          borderRadius: isMokitu
            ? `${radius}px ${radius}px ${radius}px 4px`
            : `${radius}px ${radius}px 4px ${radius}px`,
          background: bubbleBg,
          color: isError ? errorText : colors.text,
          fontSize: 14,
          lineHeight: 1.6,
          fontWeight: 400,
          fontFamily: "'Nunito', sans-serif",
          fontStyle: isError ? 'italic' : 'normal',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          boxShadow: '0 1px 2px rgba(61, 48, 40, 0.04)'
        }}
      >
        <FormattedMessageText text={msg.text} voice={msg.voice} colors={colors} />
        {msg.streaming && msg.text && (
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: '1em',
              marginLeft: 2,
              background: colors.accentDark,
              verticalAlign: 'text-bottom',
              animation: 'streamCaret 0.9s ease-in-out infinite'
            }}
          />
        )}
      </div>
    </div>
  );
}
