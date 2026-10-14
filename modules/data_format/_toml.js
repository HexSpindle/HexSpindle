// TOML 1.0 reader and writer. Dates and times are kept as strings; everything else maps directly to JSON types.

const ESCAPES = { b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', '"': '"', '\\': '\\' };

export function parseToml(text) {
  const src = text.replace(/\r\n/g, '\n');
  let i = 0;
  const root = {};
  let table = root;
  const defined = new Set();
  const line = () => src.slice(0, i).split('\n').length;
  const fail = message => { throw new Error(`TOML line ${line()}: ${message}`); };
  const skipSpace = () => { while (src[i] === ' ' || src[i] === '\t') i++; };
  const skipBlank = () => { for (;;) { skipSpace(); if (src[i] === '#') while (i < src.length && src[i] !== '\n') i++; if (src[i] === '\n') i++; else break; } };
  const endOfLine = () => { skipSpace(); if (src[i] === '#') while (i < src.length && src[i] !== '\n') i++; if (i < src.length && src[i] !== '\n') fail(`unexpected "${src.slice(i, i + 12).split('\n')[0]}"`); };

  function basicString(multi) {
    let out = '';
    if (multi && src[i] === '\n') i++;
    for (;;) {
      if (i >= src.length) fail('unterminated string');
      if (multi ? src.startsWith('"""', i) : src[i] === '"') {
        // Up to two quotes directly before the closing delimiter belong to the string.
        if (multi) { i += 3; for (let extra = 0; extra < 2 && src[i] === '"'; extra++) { out += '"'; i++; } }
        else i++;
        return out;
      }
      if (!multi && src[i] === '\n') fail('unterminated string');
      if (src[i] !== '\\') { out += src[i++]; continue; }
      const c = src[++i];
      if (c in ESCAPES) { out += ESCAPES[c]; i++; }
      else if (c === 'u' || c === 'U') { const n = c === 'u' ? 4 : 8, h = src.slice(i + 1, i + 1 + n); if (!new RegExp(`^[0-9a-fA-F]{${n}}$`).test(h)) fail('bad unicode escape'); out += String.fromCodePoint(parseInt(h, 16)); i += 1 + n; }
      else if (multi && /[ \t\n]/.test(c)) { while (/[ \t\n]/.test(src[i] || '')) i++; }   // line-ending backslash trims following whitespace
      else fail(`unknown escape \\${c}`);
    }
  }
  function literalString(multi) {
    if (multi && src[i] === '\n') i++;
    const end = multi ? src.indexOf("'''", i) : src.indexOf("'", i);
    if (end < 0 || (!multi && src.slice(i, end).includes('\n'))) fail('unterminated string');
    const out = src.slice(i, end);
    i = end + (multi ? 3 : 1);
    return out;
  }
  function string() {
    if (src.startsWith('"""', i)) { i += 3; return basicString(true); }
    if (src[i] === '"') { i++; return basicString(false); }
    if (src.startsWith("'''", i)) { i += 3; return literalString(true); }
    i++; return literalString(false);
  }
  function key() {
    const parts = [];
    for (;;) {
      skipSpace();
      if (src[i] === '"' || src[i] === "'") parts.push(string());
      else { const m = /^[A-Za-z0-9_-]+/.exec(src.slice(i, i + 200)); if (!m) fail('expected a key'); parts.push(m[0]); i += m[0].length; }
      skipSpace();
      if (src[i] === '.') { i++; continue; }
      return parts;
    }
  }
  function value() {
    skipSpace();
    const c = src[i];
    if (c === '"' || c === "'") return string();
    if (c === '[') {
      i++; const out = [];
      for (;;) { skipBlank(); if (src[i] === ']') { i++; return out; } out.push(value()); skipBlank(); if (src[i] === ',') { i++; continue; } skipBlank(); if (src[i] === ']') { i++; return out; } fail('expected , or ] in array'); }
    }
    if (c === '{') {
      i++; const out = {};
      skipSpace(); if (src[i] === '}') { i++; return out; }
      for (;;) { const k = key(); if (src[i] !== '=') fail('expected = in inline table'); i++; assign(out, k, value()); skipSpace(); if (src[i] === ',') { i++; continue; } if (src[i] === '}') { i++; return out; } fail('expected , or } in inline table'); }
    }
    const m = /^[^\s,\]}#]+(?: \d{2}:\d{2}[^\s,\]}#]*)?/.exec(src.slice(i, i + 100));
    if (!m) fail('expected a value');
    const raw = m[0]; i += raw.length;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (/^[+-]?(?:inf|nan)$/.test(raw)) return raw.endsWith('nan') ? NaN : raw[0] === '-' ? -Infinity : Infinity;
    if (/^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:\d{2})?)?$|^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(raw)) return raw;
    const digits = raw.replace(/_/g, '');
    if (/^0x[0-9a-fA-F]+$/.test(digits)) return parseInt(digits.slice(2), 16);
    if (/^0o[0-7]+$/.test(digits)) return parseInt(digits.slice(2), 8);
    if (/^0b[01]+$/.test(digits)) return parseInt(digits.slice(2), 2);
    if (/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(digits)) return Number(digits);
    return fail(`cannot read value "${raw}"`);
  }
  function descend(target, parts, forArray) {
    for (const [n, p] of parts.entries()) {
      const last = n === parts.length - 1;
      if (!(p in target)) target[p] = last && forArray ? [] : {};
      let next = target[p];
      if (last && forArray) { if (!Array.isArray(next)) fail(`${parts.join('.')} is not an array of tables`); next.push({}); return next[next.length - 1]; }
      if (Array.isArray(next)) next = next[next.length - 1];
      if (next === null || typeof next !== 'object') fail(`${parts.slice(0, n + 1).join('.')} is already a value`);
      target = next;
    }
    return target;
  }
  function assign(target, parts, v) {
    const holder = descend(target, parts.slice(0, -1), false), name = parts[parts.length - 1];
    if (name in holder) fail(`duplicate key ${parts.join('.')}`);
    holder[name] = v;
  }

  for (;;) {
    skipBlank();
    if (i >= src.length) break;
    if (src[i] === '[') {
      const array = src[i + 1] === '[';
      i += array ? 2 : 1;
      const parts = key();
      if (!src.startsWith(array ? ']]' : ']', i)) fail('unterminated table header');
      i += array ? 2 : 1;
      if (!array) { const id = parts.join('\u0000'); if (defined.has(id)) fail(`table [${parts.join('.')}] is defined twice`); defined.add(id); }
      table = descend(root, parts, array);
      endOfLine();
      continue;
    }
    const parts = key();
    if (src[i] !== '=') fail('expected = after key');
    i++;
    assign(table, parts, value());
    endOfLine();
  }
  return root;
}

const bareKey = k => /^[A-Za-z0-9_-]+$/.test(k) ? k : JSON.stringify(k);
function scalar(v) {
  if (typeof v === 'string') return JSON.stringify(v).replace(/\u007f/g, '\\u007f');
  if (typeof v === 'number') return Number.isNaN(v) ? 'nan' : v === Infinity ? 'inf' : v === -Infinity ? '-inf' : String(v);
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map(scalar).join(', ')}]`;
  if (v && typeof v === 'object') return `{ ${Object.entries(v).map(([k, x]) => `${bareKey(k)} = ${scalar(x)}`).join(', ')} }`;
  throw new Error('TOML has no null value; remove null entries first');
}
const isTable = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isTableArray = v => Array.isArray(v) && v.length > 0 && v.every(isTable);

export function stringifyToml(data) {
  if (!isTable(data)) throw new Error('The top level of a TOML document must be an object');
  const out = [];
  (function emit(obj, path) {
    const simple = Object.entries(obj).filter(([, v]) => !isTable(v) && !isTableArray(v));
    if (path.length && (simple.length || !Object.keys(obj).length)) out.push(`${out.length ? '\n' : ''}[${path.map(bareKey).join('.')}]`);
    for (const [k, v] of simple) out.push(`${bareKey(k)} = ${scalar(v)}`);
    for (const [k, v] of Object.entries(obj)) {
      if (isTable(v)) emit(v, [...path, k]);
      else if (isTableArray(v)) for (const item of v) { out.push(`${out.length ? '\n' : ''}[[${[...path, k].map(bareKey).join('.')}]]`); for (const [ik, iv] of Object.entries(item)) { if (isTable(iv) || isTableArray(iv)) continue; out.push(`${bareKey(ik)} = ${scalar(iv)}`); } for (const [ik, iv] of Object.entries(item)) if (isTable(iv)) emit(iv, [...path, k, ik]); }
    }
  })(data, []);
  return out.join('\n') + '\n';
}
