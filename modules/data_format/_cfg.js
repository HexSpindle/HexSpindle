export class Flt { constructor(v) { this.v = v; } }

const TRUEWORDS = /^(true|True|TRUE|yes|Yes|YES|on|On|ON)$/;
const FALSEWORDS = /^(false|False|FALSE|no|No|NO|off|Off|OFF)$/;
const NULLWORDS = /^(null|Null|NULL|~)$/;

function looksNumeric(s) {
  if (/^[-+]?(\.inf|\.Inf|\.INF|\.nan|\.NaN|\.NAN)$/.test(s)) return true;
  if (/^[-+]?[0-9][0-9_]*$/.test(s)) return true;
  if (/^0x[0-9a-fA-F_]+$/.test(s)) return true;
  if (/^0b[01_]+$/.test(s)) return true;
  if (/[.eE]/.test(s) && /^[-+]?(\.[0-9]+|[0-9][0-9_]*(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/.test(s)) return true;
  return false;
}

function needsQuote(s) {
  if (s === '') return true;
  if (/^\s|\s$/.test(s)) return true;
  if (/: ($|)/.test(s) && s.includes(': ')) return true;
  if (s.endsWith(':')) return true;
  if (/ #/.test(s) || s.startsWith('#')) return true;
  if (/^[-?:,\[\]{}#&*!|>'"%@`]/.test(s)) return true;
  if (TRUEWORDS.test(s) || FALSEWORDS.test(s) || NULLWORDS.test(s)) return true;
  if (looksNumeric(s)) return true;
  if (/^\d{4}-\d{2}-\d{2}([Tt ].*)?$/.test(s)) return true;
  if (/[\x00-\x08\x0b-\x1f]/.test(s)) return true;
  return false;
}

function isCollection(v) { return Array.isArray(v) || (v !== null && typeof v === 'object' && !(v instanceof Flt)); }
function isEmptyCollection(v) { return Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0; }
const pad = (n) => ' '.repeat(n);

function yamlScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Flt) {
    if (Number.isNaN(v.v)) return '.nan';
    if (v.v === Infinity) return '.inf';
    if (v.v === -Infinity) return '-.inf';
    let s = String(v.v);
    if (!/[.eE]/.test(s)) s += '.0';
    return s;
  }
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    let s = String(v);
    if (!/[.eE]/.test(s)) s += '.0';
    return s;
  }
  if (typeof v === 'bigint') return v.toString();
  const s = String(v);
  return needsQuote(s) ? "'" + s.replace(/'/g, "''") + "'" : s;
}

function mergePrefix(lines, prefix, indent) {
  return [pad(indent) + prefix + lines[0].slice(indent + prefix.length), ...lines.slice(1)];
}

function dumpBlock(v, indent) { return Array.isArray(v) ? dumpSeq(v, indent) : dumpMap(v, indent); }

function dumpSeq(arr, indent) {
  if (arr.length === 0) return [pad(indent) + '[]'];
  const out = [];
  for (const item of arr) {
    if (isCollection(item)) {
      if (isEmptyCollection(item)) { out.push(pad(indent) + '- ' + (Array.isArray(item) ? '[]' : '{}')); continue; }
      out.push(...mergePrefix(dumpBlock(item, indent + 2), '- ', indent));
    } else if (typeof item === 'string' && item.includes('\n')) {
      out.push(pad(indent) + '- |');
      for (const l of item.split('\n')) out.push(pad(indent + 2) + l);
    } else {
      out.push(pad(indent) + '- ' + yamlScalar(item));
    }
  }
  return out;
}

function dumpMap(obj, indent) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return [pad(indent) + '{}'];
  const out = [];
  for (const k of keys) {
    const v = obj[k];
    const keyStr = yamlScalar(String(k));
    if (isCollection(v)) {
      if (isEmptyCollection(v)) { out.push(pad(indent) + keyStr + ': ' + (Array.isArray(v) ? '[]' : '{}')); continue; }
      out.push(pad(indent) + keyStr + ':');
      out.push(...dumpBlock(v, Array.isArray(v) ? indent : indent + 2));
    } else if (typeof v === 'string' && v.includes('\n')) {
      out.push(pad(indent) + keyStr + ': |');
      for (const l of v.split('\n')) out.push(pad(indent + 2) + l);
    } else {
      out.push(pad(indent) + keyStr + ': ' + yamlScalar(v));
    }
  }
  return out;
}

export function yamlDump(obj) {
  if (isCollection(obj)) return (isEmptyCollection(obj) ? (Array.isArray(obj) ? '[]' : '{}') : dumpBlock(obj, 0).join('\n')) + '\n';
  return yamlScalar(obj) + '\n...\n';
}


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

  function parseNested(pindent) {
    const j = peek();
    if (j < 0) return null;
    const { indent, content } = info(j);
    if (indent > pindent) {
      if (isSeqItem(content)) return parseSeq(indent);
      if (findTopColon(content) >= 0) return parseMap(indent);
      i = j + 1;
      return parseScalarOrFlow(content);
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
      else result[key] = parseScalarOrFlow(remainder);
    }
    return result;
  }

  const j = peek();
  if (j < 0) return null;
  const { indent, content } = info(j);
  if (isSeqItem(content)) return parseSeq(indent);
  if (findTopColon(content) >= 0) return parseMap(indent);
  i = j + 1;
  return parseScalarOrFlow(content);
}

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
