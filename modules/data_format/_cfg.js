export class Flt { constructor(v) { this.v = v; } }

// ---------- YAML ----------

const TRUEWORDS = /^(true|True|TRUE|yes|Yes|YES|on|On|ON)$/;
const FALSEWORDS = /^(false|False|FALSE|no|No|NO|off|Off|OFF)$/;
const NULLWORDS = /^(null|Null|NULL|~)$/;


const pad = (n) => ' '.repeat(n);

const INDENT = 2;
const LINE_WIDTH = 80;

// --- implicit tag resolution (js-yaml DUMP_SCHEMA = YAML 1.1 + Core) ---
const NULL_VALUES = ['', '~', 'null', 'Null', 'NULL'];
const BOOL_VALUES = ['true', 'True', 'TRUE', 'y', 'Y', 'yes', 'Yes', 'YES', 'on', 'On', 'ON',
  'false', 'False', 'FALSE', 'n', 'N', 'no', 'No', 'NO', 'off', 'Off', 'OFF'];
const Y11_INT = /^(?:[-+]?0b[0-1_]+|[-+]?0[0-7_]+|[-+]?0x[0-9a-fA-F_]+|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+|[-+]?(?:0|[1-9][0-9_]*))$/;
const CORE_INT = /^(?:0o[0-7]+|0x[0-9a-fA-F]+|[-+]?[0-9]+)$/;
const Y11_FLOAT = /^(?:[-+]?(?:(?:[0-9][0-9_]*)?\.[0-9_]*)(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;
const CORE_FLOAT = /^(?:[-+]?[0-9]+(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;
const Y11_DATE = /^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$/;
const Y11_TIMESTAMP = /^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\.([0-9]*))?(?:[ \t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$/;

// True when a plain scalar would NOT read back as a string (so it has to be quoted).
function resolvesToNonString(s) {
  if (NULL_VALUES.indexOf(s) !== -1) return true;
  if (BOOL_VALUES.indexOf(s) !== -1) return true;
  if (Y11_INT.test(s) || CORE_INT.test(s)) return true;
  if (Y11_FLOAT.test(s) || CORE_FLOAT.test(s)) return true;
  if (Y11_DATE.test(s) || Y11_TIMESTAMP.test(s)) return true;
  if (s === '<<' || s === '=') return true;
  return false;
}

// --- plain / single-quoted / block scalar validity (js-yaml's YAML grammar regexes) ---
const SRC_C_PRINTABLE = '[\\x09\\x0A\\x0D\\x20-\\x7E\\x85\\xA0-\\uD7FF\\uE000-\\uFFFD\\u{10000}-\\u{10FFFF}]';
const SRC_B_CHAR = '[\\n\\r]';
const SRC_C_BYTE_ORDER_MARK = '\\uFEFF';
const SRC_S_WHITE = '[ \\t]';
const SRC_NB_CHAR = `(?:(?!(?:${SRC_B_CHAR}|${SRC_C_BYTE_ORDER_MARK}))${SRC_C_PRINTABLE})`;
const SRC_NS_CHAR = `(?:(?!${SRC_S_WHITE})${SRC_NB_CHAR})`;
const SRC_NB_JSON = '[\\x09\\x20-\\uD7FF\\uE000-\\uFFFF\\u{10000}-\\u{10FFFF}]';
const SRC_C_INDICATOR = '[-?:,\\[\\]{}#&*!|>\'"%@`]';
const SRC_NS_PLAIN_FIRST = `(?:(?:(?!${SRC_C_INDICATOR})${SRC_NS_CHAR})|[?:-](?=${SRC_NS_CHAR}))`;
const SRC_NS_PLAIN_CHAR = `(?:(?:(?![:#])${SRC_NS_CHAR})|:(?=${SRC_NS_CHAR}))#*`;
const SRC_NB_NS_PLAIN_IN_LINE = `(?:${SRC_S_WHITE}*${SRC_NS_PLAIN_CHAR})*`;
const SRC_NS_PLAIN_ONE_LINE = `${SRC_NS_PLAIN_FIRST}#*${SRC_NB_NS_PLAIN_IN_LINE}`;
const SRC_S_NS_PLAIN_NEXT_LINE = `\\n+${SRC_NS_PLAIN_CHAR}${SRC_NB_NS_PLAIN_IN_LINE}`;
const NS_PLAIN_MULTI_LINE = new RegExp(`^(?:${SRC_NS_PLAIN_ONE_LINE}(?:${SRC_S_NS_PLAIN_NEXT_LINE})*)$`, 'u');
const NS_PLAIN_BLOCK_KEY = new RegExp(`^(?:${SRC_NS_PLAIN_ONE_LINE})$`, 'u');
const NB_SINGLE_ONE_LINE = new RegExp(`^(?:${SRC_NB_JSON})*$`, 'u');
const NB_SINGLE_MULTI_LINE = new RegExp(`^(?:${SRC_NB_JSON}|\\n)*$`, 'u');
const BLOCK_SCALAR_CONTENT = new RegExp(`^(?:${SRC_NB_CHAR}|\\n)*$`, 'u');
const C_FORBIDDEN_FIRST_LINE = /^(?:---|\.\.\.)(?=$|[ \t\n\r])/;
const C_FORBIDDEN_CONTENT = /^(?:---|\.\.\.)(?=$|[ \t\n\r])/m;

let openEnded = false;

const STYLE_PLAIN = 'plain', STYLE_SINGLE = 'single', STYLE_DOUBLE = 'double',
  STYLE_LITERAL = 'literal', STYLE_FOLDED = 'folded';

function canUsePlain(s, L) {
  if (s !== '') {
    if (!(L.isKey ? NS_PLAIN_BLOCK_KEY : NS_PLAIN_MULTI_LINE).test(s)) return false;
    if (L.shiftOfFirstLine === 0 && C_FORBIDDEN_FIRST_LINE.test(s)) return false;
    if (L.shiftOfContent === 0) {
      const nl = s.indexOf('\n');
      if (nl !== -1 && C_FORBIDDEN_CONTENT.test(s.slice(nl + 1))) return false;
    }
  }
  return !resolvesToNonString(s);
}

function canUseSingleQuoted(s, L) {
  if (!(L.isKey ? NB_SINGLE_ONE_LINE : NB_SINGLE_MULTI_LINE).test(s)) return false;
  if (/[ \t]\n|\n[ \t]/.test(s)) return false;
  if (!L.isKey && L.shiftOfContent === 0) {
    const nl = s.indexOf('\n');
    if (nl !== -1 && C_FORBIDDEN_CONTENT.test(s.slice(nl + 1))) return false;
  }
  return true;
}

function canUseBlock(s, L) {
  if (L.flowOnly || !BLOCK_SCALAR_CONTENT.test(s)) return false;
  const contentIndent = L.shiftOfContent - L.shiftOfParent;
  if (contentIndent < 1) return false;
  if (contentIndent > 9 && /^\n* /.test(s)) return false;
  if (L.shiftOfContent === 0 && C_FORBIDDEN_CONTENT.test(s)) return false;
  return true;
}

const ESCAPES = {
  '\0': '\\0', '\x07': '\\a', '\b': '\\b', '\t': '\\t', '\n': '\\n', '\v': '\\v',
  '\f': '\\f', '\r': '\\r', '\x1b': '\\e', '"': '\\"', '\\': '\\\\',
  '\x85': '\\N', '\xa0': '\\_', '\u2028': '\\L', '\u2029': '\\P',
};
const CHARACTERS_TO_ESCAPE = /["\\\x00-\x1F\x7F-\xA0\u2028\u2029\uD800-\uDFFF\uFEFF\uFFFE\uFFFF]/gu;
function escapeString(s) {
  return s.replace(CHARACTERS_TO_ESCAPE, (c) => {
    if (c in ESCAPES) return ESCAPES[c];
    const code = c.charCodeAt(0);
    const hex = code.toString(16).toUpperCase();
    return code <= 255 ? '\\x' + '0'.repeat(2 - hex.length) + hex : '\\u' + '0'.repeat(4 - hex.length) + hex;
  });
}

function isMoreIndented(c) { return c === ' ' || c === '\t'; }

function foldLine(line, width) {
  if (line === '' || isMoreIndented(line[0])) return line;
  const breakRe = / [^ \t]/g;
  let match, start = 0, end, curr = 0, next = 0, result = '';
  while ((match = breakRe.exec(line))) {
    next = match.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += `\n${line.slice(start, end)}`;
      start = end + 1;
    }
    curr = next;
  }
  result += '\n';
  if (line.length - start > width && curr > start) result += `${line.slice(start, curr)}\n${line.slice(curr + 1)}`;
  else result += line.slice(start);
  return result.slice(1);
}

function foldBlockScalar(s, width) {
  const lineRe = /(\n+)([^\n]*)/g;
  let nextLF = s.indexOf('\n');
  if (nextLF === -1) nextLF = s.length;
  lineRe.lastIndex = nextLF;
  let result = foldLine(s.slice(0, nextLF), width);
  let prevMoreIndented = s[0] === '\n' || isMoreIndented(s[0]);
  let match;
  while ((match = lineRe.exec(s))) {
    const line = match[2];
    const moreIndented = line !== '' && isMoreIndented(line[0]);
    result += match[1] + (!prevMoreIndented && !moreIndented && line !== '' ? '\n' : '') + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}

function indentString(s, spaces) {
  const ind = pad(spaces);
  let position = 0, result = '';
  while (position < s.length) {
    let line;
    const next = s.indexOf('\n', position);
    if (next === -1) { line = s.slice(position); position = s.length; }
    else { line = s.slice(position, next + 1); position = next + 1; }
    if (line.length && line !== '\n') result += ind;
    result += line;
  }
  return result;
}

function blockHeader(s, shiftOfParent, shiftOfContent) {
  const indicator = /^\n* /.test(s) ? String(shiftOfContent - shiftOfParent) : '';
  const clip = s[s.length - 1] === '\n';
  return `${indicator}${clip && (s[s.length - 2] === '\n' || s === '\n') ? '+' : clip ? '' : '-'}\n`;
}

function dropEndingNewline(s) { return s[s.length - 1] === '\n' ? s.slice(0, -1) : s; }

function encodeFlowBreaks(s, shiftOfContent) {
  let nextLF = s.indexOf('\n');
  if (nextLF === -1) return s;
  const p = pad(shiftOfContent);
  let result = s.slice(0, nextLF);
  const lineRe = /(\n+)([^\n]*)/g;
  lineRe.lastIndex = nextLF;
  let match;
  while ((match = lineRe.exec(s))) result += '\n'.repeat(match[1].length + 1) + p + match[2];
  return result;
}

// Scalar representation of a non-string value (js-yaml's int/float represent()).
function representNumber(v) {
  if (typeof v === 'bigint') return v.toString();
  if (Number.isNaN(v)) return '.nan';
  if (v === Infinity) return '.inf';
  if (v === -Infinity) return '-.inf';
  if (Object.is(v, -0)) return '-0.0';
  const s = v.toString(10);
  return /^[-+]?[0-9]+e/.test(s) ? s.replace('e', '.e') : s;
}

function scalarText(v) {
  if (v === null || v === undefined) return { text: 'null', string: false };
  if (typeof v === 'boolean') return { text: v ? 'true' : 'false', string: false };
  if (v instanceof Flt) {
    // HexSpindle's explicit-float wrapper (from TOML/YAML input): keep it a float.
    const t = representNumber(v.v);
    return { text: /[.eE]|inf|nan/.test(t) ? t : t + '.0', string: false };
  }
  if (typeof v === 'number' || typeof v === 'bigint') return { text: representNumber(v), string: false };
  return { text: String(v), string: true };
}

// Mirrors js-yaml's scalar style rules, in their order.
function renderScalar(v, level, isKey, flowOnly) {
  const info = scalarText(v);
  if (!info.string) { openEnded = false; return info.text; }
  const s = info.text;
  const L = {
    isKey, flowOnly,
    shiftOfParent: level === 0 ? -1 : INDENT * (level - 1),
    shiftOfContent: INDENT * Math.max(1, level),
    shiftOfFirstLine: level === 0 ? 0 : INDENT * level,
  };
  const plainOk = canUsePlain(s, L);
  const singleOk = canUseSingleQuoted(s, L);
  const blockOk = canUseBlock(s, L);

  let style = STYLE_PLAIN;
  // doubleQuoteForInvisibles
  if (style === STYLE_PLAIN && /[\t\x7F-\xA0\u2028\u2029\uFEFF\uFFFE\uFFFF]/.test(s)) style = STYLE_DOUBLE;
  // doubleQuoteWhitespaceOnly
  if (style === STYLE_PLAIN && /^\s+$/.test(s)) style = STYLE_DOUBLE;
  // tryLongOrMultilineAsBlock
  if (style === STYLE_PLAIN && !isKey) {
    const multiline = s.indexOf('\n') !== -1;
    if (!blockOk) {
      if (multiline) style = STYLE_DOUBLE;
    } else {
      const availableWidth = Math.max(Math.min(LINE_WIDTH, 40), LINE_WIDTH - L.shiftOfContent);
      let position = 0, shouldFold = false;
      while (position <= s.length) {
        const nl = s.indexOf('\n', position);
        const lineEnd = nl === -1 ? s.length : nl;
        const line = s.slice(position, lineEnd);
        if (line.length > availableWidth && line[0] !== ' ' && / [^ \t]/.test(line)) shouldFold = true;
        if (nl === -1) break;
        position = nl + 1;
      }
      if (shouldFold) style = STYLE_FOLDED;
      else if (multiline) style = STYLE_LITERAL;
    }
  }
  // quoteInvalidPlain
  if (style === STYLE_PLAIN && !plainOk) style = singleOk ? STYLE_SINGLE : STYLE_DOUBLE;
  // fallbackToDoubleQuoted
  if ((style === STYLE_SINGLE && !singleOk) || ((style === STYLE_LITERAL || style === STYLE_FOLDED) && !blockOk)) style = STYLE_DOUBLE;

  openEnded = (style === STYLE_LITERAL || style === STYLE_FOLDED) && (s === '\n' || s.endsWith('\n\n'));

  switch (style) {
    case STYLE_PLAIN: return encodeFlowBreaks(s, L.shiftOfContent);
    case STYLE_SINGLE: return "'" + encodeFlowBreaks(s, L.shiftOfContent).replace(/'/g, "''") + "'";
    case STYLE_LITERAL:
      return '|' + blockHeader(s, L.shiftOfParent, L.shiftOfContent) + dropEndingNewline(indentString(s, L.shiftOfContent));
    case STYLE_FOLDED: {
      const availableWidth = Math.max(Math.min(LINE_WIDTH, 40), LINE_WIDTH - L.shiftOfContent);
      return '>' + blockHeader(s, L.shiftOfParent, L.shiftOfContent) +
        dropEndingNewline(indentString(foldBlockScalar(s, availableWidth), L.shiftOfContent));
    }
    default: return '"' + escapeString(s) + '"';
  }
}

function isCollection(v) { return Array.isArray(v) || (v !== null && typeof v === 'object' && !(v instanceof Flt)); }
function isEmptyCollection(v) { return Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0; }

function writeBlockSequence(arr, level, compact) {
  let result = '';
  for (const item of arr) {
    const text = writeNode(item, level + 1, { block: true, compact: true, isblockseq: true });
    if (!compact || result !== '') result += '\n' + pad(INDENT * level);
    result += (text === '' || text[0] === '\n') ? '-' : '- ';
    result += text;
  }
  return result;
}

function writeBlockMapping(obj, level, compact) {
  let result = '';
  for (const k of Object.keys(obj)) {
    let buf = '';
    if (!compact || result !== '') buf += '\n' + pad(INDENT * level);
    const key = String(k);
    const keyText = renderScalar(key, level + 1, true, false);
    const explicitPair = key.indexOf('\n') !== -1;
    if (explicitPair) buf += (keyText && keyText[0] === '\n') ? '?' : '? ';
    buf += keyText;
    if (explicitPair) buf += '\n' + pad(INDENT * level);
    const valueText = writeNode(obj[k], level + 1, { block: true, compact: explicitPair, isblockseq: explicitPair });
    buf += (valueText === '' || valueText[0] === '\n') ? ':' : ': ';
    buf += valueText;
    result += buf;
  }
  return result;
}

function writeNode(v, level, ctx) {
  const { block = false, compact = false } = ctx;
  if (isCollection(v)) {
    if (isEmptyCollection(v) || !block) { openEnded = false; return Array.isArray(v)
      ? '[' + v.map((i) => writeNode(i, level, {})).join(', ') + ']'
      : '{' + Object.keys(v).map((k) => renderScalar(String(k), level, true, true) + ': ' + writeNode(v[k], level, {})).join(', ') + '}'; }
    return Array.isArray(v) ? writeBlockSequence(v, level, compact) : writeBlockMapping(v, level, compact);
  }
  return renderScalar(v, level, ctx.iskey === true, !block);
}

export function yamlDump(obj) {
  openEnded = false;
  // A document left open-ended (a block scalar ending in a blank line) needs the "..." marker.
  const body = writeNode(obj, 0, { block: true, compact: true });
  return body + '\n' + (openEnded ? '...\n' : '');
}

// --- YAML parsing ---

function stripComment(line) {
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inS) { if (c === "'") inS = false; continue; }
    if (inD) { if (c === '"' && line[i - 1] !== '\\') inD = false; continue; }
    if (c === "'") { inS = true; continue; }
    if (c === '"') { inD = true; continue; }
    if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function findTopColon(s) {
  let depth = 0, inS = false, inD = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inS) { if (c === "'") inS = false; continue; }
    if (inD) { if (c === '"' && s[i - 1] !== '\\') inD = false; continue; }
    if (c === "'") { inS = true; continue; }
    if (c === '"') { inD = true; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === ':' && depth === 0 && (i + 1 === s.length || s[i + 1] === ' ')) return i;
  }
  return -1;
}

function unquote(s) {
  if (s.length >= 2 && s[0] === "'" && s[s.length - 1] === "'") return s.slice(1, -1).replace(/''/g, "'");
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') { try { return JSON.parse(s); } catch { return s.slice(1, -1); } }
  return s;
}

function coerceScalar(raw) {
  if (raw === '') return null;
  if (raw.length >= 2 && (raw[0] === "'" || raw[0] === '"')) return unquote(raw);
  if (NULLWORDS.test(raw)) return null;
  if (TRUEWORDS.test(raw)) return true;
  if (FALSEWORDS.test(raw)) return false;
  if (/^[-+]?\.inf$/i.test(raw)) return raw[0] === '-' ? -Infinity : Infinity;
  if (/^\.nan$/i.test(raw)) return NaN;
  if (/^[-+]?[0-9][0-9_]*$/.test(raw)) return parseInt(raw.replace(/_/g, ''), 10);
  if (/^0x[0-9a-fA-F_]+$/.test(raw)) return parseInt(raw.replace(/_/g, ''), 16);
  if (/^0b[01_]+$/.test(raw)) return parseInt(raw.slice(2).replace(/_/g, ''), 2);
  if (/[.eE]/.test(raw) && /^[-+]?(\.[0-9]+|[0-9][0-9_]*(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/.test(raw)) return parseFloat(raw.replace(/_/g, ''));
  return raw;
}

function skipWs(s, pos) { while (pos < s.length && s[pos] === ' ') pos++; return pos; }

function parseFlow(s, pos) {
  pos = skipWs(s, pos);
  if (s[pos] === '[') return parseFlowSeq(s, pos);
  if (s[pos] === '{') return parseFlowMap(s, pos);
  if (s[pos] === "'" || s[pos] === '"') {
    const q = s[pos];
    let j = pos + 1;
    while (j < s.length && !(s[j] === q && (q === "'" ? true : s[j - 1] !== '\\'))) {
      if (q === "'" && s[j] === "'" && s[j + 1] === "'") j += 2; else j++;
    }
    const raw = s.slice(pos, j + 1);
    return [unquote(raw), j + 1];
  }
  let start = pos, depth = 0;
  while (pos < s.length) {
    const c = s[pos];
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { if (depth === 0) break; depth--; }
    else if (c === ',' && depth === 0) break;
    pos++;
  }
  return [coerceScalar(s.slice(start, pos).trim()), pos];
}

function parseFlowSeq(s, pos) {
  pos++;
  const out = [];
  pos = skipWs(s, pos);
  if (s[pos] === ']') return [out, pos + 1];
  while (true) {
    const [v, np] = parseFlow(s, pos);
    out.push(v);
    pos = skipWs(s, np);
    if (s[pos] === ',') { pos = skipWs(s, pos + 1); continue; }
    if (s[pos] === ']') { pos++; break; }
    break;
  }
  return [out, pos];
}

function parseFlowMap(s, pos) {
  pos++;
  const out = {};
  pos = skipWs(s, pos);
  if (s[pos] === '}') return [out, pos + 1];
  while (true) {
    const [k, np1] = parseFlow(s, pos);
    pos = skipWs(s, np1);
    if (s[pos] === ':') pos = skipWs(s, pos + 1);
    const [v, np2] = parseFlow(s, pos);
    out[String(k)] = v;
    pos = skipWs(s, np2);
    if (s[pos] === ',') { pos = skipWs(s, pos + 1); continue; }
    if (s[pos] === '}') { pos++; break; }
    break;
  }
  return [out, pos];
}

function parseScalarOrFlow(content) {
  if (content[0] === '[' || content[0] === '{') return parseFlow(content, 0)[0];
  return coerceScalar(content);
}

function isSeqItem(content) { return content === '-' || content.startsWith('- '); }

export function yamlLoad(text) {
  const lines = text.replace(/\t/g, '  ').split(/\r\n|\r|\n/);
  let i = 0;

  function peek() {
    let j = i;
    while (j < lines.length) {
      const s = stripComment(lines[j]);
      if (s.trim() !== '' && s.trim() !== '---' && s.trim() !== '...') return j;
      if (s.trim() === '...') return -1;
      j++;
    }
    return -1;
  }
  function info(j) {
    const s = stripComment(lines[j]);
    const trimmed = s.trimStart();
    return { indent: s.length - trimmed.length, content: trimmed.trimEnd() };
  }

  function readLiteralBlock(indicator, hintIndent) {
    const strip = indicator.includes('-');
    const blockLines = [];
    let refIndent = null;
    while (i < lines.length) {
      const raw = lines[i];
      if (raw.trim() === '') { blockLines.push(''); i++; continue; }
      const ind = raw.length - raw.trimStart().length;
      if (refIndent === null) {
        if (ind < hintIndent) break;
        refIndent = ind;
      }
      if (ind < refIndent) break;
      blockLines.push(raw.slice(refIndent));
      i++;
    }
    while (blockLines.length && blockLines[blockLines.length - 1] === '') blockLines.pop();
    const text2 = blockLines.join('\n');
    return strip ? text2 : text2 + '\n';
  }

  function plainScalar(content, parentIndent) {
    if (/^[\[{'"]/.test(content)) return parseScalarOrFlow(content);
    const parts = [content];
    let sepBefore = [];
    let blanks = 0;
    if (stripComment(lines[i - 1] ?? '').trimEnd().length === (lines[i - 1] ?? '').trimEnd().length) {
      while (i < lines.length) {
        const raw = lines[i];
        if (raw.trim() === '') { blanks++; i++; continue; }
        const s = stripComment(raw);
        const t = s.trim();
        const ind = s.length - s.trimStart().length;
        if (t === '' || ind <= parentIndent || (ind === 0 && (t === '---' || t === '...'))) break;
        parts.push(t);
        sepBefore.push(blanks ? '\n'.repeat(blanks) : ' ');
        blanks = 0;
        i++;
        if (s.trimEnd().length !== raw.trimEnd().length) break;  // a comment ends the scalar
      }
    }
    if (parts.length === 1) return coerceScalar(content);
    return parts.reduce((acc, p, k) => acc + sepBefore[k - 1] + p);
  }

  function parseNested(pindent) {
    const j = peek();
    if (j < 0) return null;
    const { indent, content } = info(j);
    if (indent > pindent) {
      if (isSeqItem(content)) return parseSeq(indent);
      if (findTopColon(content) >= 0) return parseMap(indent);
      i = j + 1;
      return plainScalar(content, pindent);
    }
    if (indent === pindent && isSeqItem(content)) return parseSeq(pindent);
    return null;
  }

  function parseSeq(indent) {
    const result = [];
    while (true) {
      const j = peek();
      if (j < 0) break;
      const cur = info(j);
      if (cur.indent !== indent || !isSeqItem(cur.content)) break;
      i = j + 1;
      const remainder = cur.content === '-' ? '' : cur.content.slice(1).trimStart();
      if (remainder === '') result.push(parseNested(indent));
      else if (/^[|>][-+]?$/.test(remainder)) result.push(readLiteralBlock(remainder, indent + 2));
      else { lines.splice(i, 0, pad(indent + 2) + remainder); result.push(parseNested(indent + 1) ?? parseScalarOrFlowLine()); }
    }
    return result;
  }

  function parseScalarOrFlowLine() {
    const j = peek();
    if (j < 0) return null;
    const cur = info(j);
    i = j + 1;
    return parseScalarOrFlow(cur.content);
  }

  function parseMap(indent) {
    const result = {};
    while (true) {
      const j = peek();
      if (j < 0) break;
      const cur = info(j);
      if (cur.indent !== indent) break;
      const colon = findTopColon(cur.content);
      if (colon < 0) break;
      i = j + 1;
      const key = unquote(cur.content.slice(0, colon).trim());
      const remainder = cur.content.slice(colon + 1).trim();
      if (remainder === '') result[key] = parseNested(indent);
      else if (/^[|>][-+]?$/.test(remainder)) result[key] = readLiteralBlock(remainder, indent + 2);
      else result[key] = plainScalar(remainder, indent);
    }
    return result;
  }

  const j = peek();
  if (j < 0) return null;
  const { indent, content } = info(j);
  if (isSeqItem(content)) return parseSeq(indent);
  if (findTopColon(content) >= 0) return parseMap(indent);
  i = j + 1;
  return plainScalar(content, -1);
}

// ---------- TOML ----------

export function tomlDump(obj) {
  const lines = [];
  const esc = (v) => {
    if (v === null || v === undefined) return '""';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number' || typeof v === 'bigint') return String(v);
    if (Array.isArray(v)) return '[' + v.map(esc).join(', ') + ']';
    return JSON.stringify(String(v));
  };
  const section = (name, d, prefix = '') => {
    const scalarKeys = Object.keys(d).filter(k => !(d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])));
    if (scalarKeys.length || !prefix) {
      if (prefix) lines.push(`[${prefix}]`);
      for (const k of scalarKeys) lines.push(`${k} = ${esc(d[k])}`);
      if (scalarKeys.length) lines.push('');
    }
    for (const k of Object.keys(d)) {
      if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) section(k, d[k], prefix ? `${prefix}.${k}` : k);
    }
  };
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) section('', obj);
  return lines.join('\n').trim() + '\n';
}

function stripTomlComment(line) {
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inS) { if (c === "'") inS = false; continue; }
    if (inD) { if (c === '"' && line[i - 1] !== '\\') inD = false; continue; }
    if (c === "'") { inS = true; continue; }
    if (c === '"') { inD = true; continue; }
    if (c === '#') return line.slice(0, i);
  }
  return line;
}

function splitTopLevel(inner) {
  const parts = [];
  let depth = 0, inS = false, inD = false, start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inS) { if (c === "'") inS = false; continue; }
    if (inD) { if (c === '"' && inner[i - 1] !== '\\') inD = false; continue; }
    if (c === "'") { inS = true; continue; }
    if (c === '"') { inD = true; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { parts.push(inner.slice(start, i).trim()); start = i + 1; }
  }
  const last = inner.slice(start).trim();
  if (last !== '') parts.push(last);
  return parts;
}

function parseTomlValue(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s.startsWith('[') && s.endsWith(']')) return splitTopLevel(s.slice(1, -1)).map(parseTomlValue);
  if (/^".*"$/.test(s)) { try { return JSON.parse(s); } catch { return s.slice(1, -1); } }
  if (/^'.*'$/.test(s)) return s.slice(1, -1);
  if (/^[-+]?\d+$/.test(s)) return parseInt(s, 10);
  if (/^[-+]?(\d*\.\d+|\d+\.\d*)([eE][-+]?\d+)?$/.test(s) || /^[-+]?\d+[eE][-+]?\d+$/.test(s)) return parseFloat(s);
  return s;
}

export function tomlLoad(text) {
  const root = {};
  let current = root;
  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = stripTomlComment(rawLine).trim();
    if (!line) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      const path = line.slice(1, -1).split('.').map(s => s.trim().replace(/^["']|["']$/g, ''));
      current = root;
      for (const p of path) { if (!current[p] || typeof current[p] !== 'object' || Array.isArray(current[p])) current[p] = {}; current = current[p]; }
      continue;
    }
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim().replace(/^["']|["']$/g, '');
    current[key] = parseTomlValue(line.slice(eq + 1).trim());
  }
  return root;
}

// ---------- INI ----------

export function iniDump(obj) {
  const lines = [];
  const defaults = {};
  const sections = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) sections[k] = v;
    else defaults[k] = v;
  }
  const writeSection = (name, d) => {
    lines.push(`[${name}]`);
    for (const [k, v] of Object.entries(d)) lines.push(`${k} = ${v === null || v === undefined ? '' : String(v)}`);
    lines.push('');
  };
  if (Object.keys(defaults).length) writeSection('DEFAULT', defaults);
  for (const [name, d] of Object.entries(sections)) writeSection(name, d);
  return lines.join('\n') + (lines.length ? '\n' : '');
}

export function iniLoad(text) {
  const defaults = {};
  const sections = {};
  let current = null;
  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const secMatch = line.match(/^\[(.+)\]$/);
    if (secMatch) {
      const name = secMatch[1].trim();
      current = name === 'DEFAULT' ? defaults : (sections[name] = sections[name] || {});
      continue;
    }
    const m = line.match(/^([^=:]+)[=:](.*)$/);
    if (!m || !current) continue;
    current[m[1].trim()] = m[2].trim();
  }
  const out = {};
  for (const [name, d] of Object.entries(sections)) out[name] = { ...defaults, ...d };
  return out;
}
