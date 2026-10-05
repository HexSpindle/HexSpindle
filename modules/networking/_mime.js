import { base64Decode } from '../../core/util.js';

export function asciiReplace(bytes) {
  let s = '';
  for (const b of bytes) s += b < 0x80 ? String.fromCharCode(b) : '�';
  return s;
}

export function decodeWithCharset(bytes, charset) {
  if (charset) {
    try { return new TextDecoder(charset.trim().toLowerCase(), { fatal: false }).decode(bytes); }
    catch { /* fall through to the ascii-with-replacement default below */ }
  }
  return asciiReplace(bytes);
}

function decodeQEncoding(s) {
  s = s.replace(/_/g, ' ');
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
    else out.push(s.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(out);
}

/** Decodes RFC 2047 "=?charset?Q/B?...?=" encoded-words in a header value, the way accessing a
 * header through email.policy.default does. Whitespace between two adjacent encoded-words is
 * dropped; whitespace elsewhere is kept. */
export function decodeRfc2047(value) {
  const re = /=\?([^?\s]+)\?([bBqQ])\?([^?]*)\?=/g;
  let result = '', lastIndex = 0, lastWasEncoded = false, m;
  while ((m = re.exec(value)) !== null) {
    const between = value.slice(lastIndex, m.index);
    if (!(lastWasEncoded && /^[ \t\r\n]*$/.test(between))) result += between;
    const [, charset, enc, text] = m;
    const bytes = enc.toLowerCase() === 'b' ? base64Decode(text) : decodeQEncoding(text);
    result += decodeWithCharset(bytes, charset);
    lastIndex = re.lastIndex;
    lastWasEncoded = true;
  }
  result += value.slice(lastIndex);
  return result;
}

export function decodeQuotedPrintable(s) {
  s = s.replace(/\r\n/g, '\n');
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '=') {
      if (s[i + 1] === '\n') { i += 1; continue; }
      const hex = s.substr(i + 1, 2);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) { out.push(parseInt(hex, 16)); i += 2; }
      else out.push(c.charCodeAt(0) & 0xff);
    } else {
      out.push(c.charCodeAt(0) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** Splits a message/part into its unfolded headers and raw body text, the way policy.default's
 * header access joins a folded header by dropping just the line break (keeping the fold's
 * whitespace), unlike compat32 which keeps an embedded "\n". */
export function parseHeadersAndBody(text) {
  const norm = text.replace(/\r\n/g, '\n');
  const blankIdx = norm.indexOf('\n\n');
  const headersBlock = blankIdx === -1 ? norm : norm.slice(0, blankIdx);
  const body = blankIdx === -1 ? '' : norm.slice(blankIdx + 2);
  const lines = headersBlock.split('\n');
  const headers = [];
  let current = null;
  for (const line of lines) {
    if (current && /^[ \t]/.test(line)) { current[1] += line; continue; }
    const idx = line.indexOf(':');
    if (idx === -1) { current = null; continue; }
    current = [line.slice(0, idx), line.slice(idx + 1).replace(/^[ \t]+/, '')];
    headers.push(current);
  }
  return { headers, body };
}

export function getHeader(headers, name) {
  const low = name.toLowerCase();
  const h = headers.find(([k]) => k.toLowerCase() === low);
  return h ? h[1] : null;
}

/** Parses "type/subtype; param=value; param2="quoted value"" style structured header values. */
export function parseParamHeader(value) {
  if (!value) return { value: '', params: {} };
  const segs = value.split(';');
  const main = segs[0].trim();
  const params = {};
  for (let i = 1; i < segs.length; i++) {
    const seg = segs[i];
    const eq = seg.indexOf('=');
    if (eq === -1) continue;
    const key = seg.slice(0, eq).trim().toLowerCase();
    let val = seg.slice(eq + 1).trim();
    if (val.length >= 2 && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    params[key] = val;
  }
  return { value: main, params };
}

/** policy.default re-serializes Content-Type/Content-Disposition (the "MIME parameter headers")
 * with every parameter value quoted, while leaving the main value and parameter names' casing
 * untouched - mirror that for the raw-header listing. */
export function canonicalizeParamHeader(value) {
  const segs = value.split(';');
  const main = segs[0].trim();
  const params = [];
  for (let i = 1; i < segs.length; i++) {
    const eq = segs[i].indexOf('=');
    if (eq === -1) continue;
    const key = segs[i].slice(0, eq).trim();
    let val = segs[i].slice(eq + 1).trim();
    if (val.length >= 2 && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    params.push(`${key}="${val}"`);
  }
  return [main, ...params].join('; ');
}

function splitMultipart(body, boundary) {
  const delim = '--' + boundary;
  const lines = body.split('\n');
  const parts = [];
  let current = null;
  for (const line of lines) {
    const trimmed = line.replace(/\r$/, '');
    if (trimmed === delim || trimmed === delim + '--') {
      if (current !== null) parts.push(current.join('\n'));
      if (trimmed === delim + '--') return parts;
      current = [];
    } else if (current !== null) {
      current.push(line);
    }
  }
  return parts;
}

/** Builds the parse tree node for a message/part: {headers, type, params, isMulti, body, children}. */
export function parseMimeNode(text) {
  const { headers, body } = parseHeadersAndBody(text);
  const ct = parseParamHeader(getHeader(headers, 'Content-Type') || 'text/plain');
  const type = (ct.value || 'text/plain').toLowerCase();
  const isMulti = type.startsWith('multipart/');
  const node = { headers, type, params: ct.params, isMulti, body, children: [] };
  if (isMulti && ct.params.boundary) node.children = splitMultipart(body, ct.params.boundary).map(parseMimeNode);
  return node;
}

export function* walk(node) {
  yield node;
  if (node.isMulti) for (const child of node.children) yield* walk(child);
}

export function getFilename(node) {
  const cd = parseParamHeader(getHeader(node.headers, 'Content-Disposition') || '');
  if (cd.params.filename) return cd.params.filename;
  if (node.params.name) return node.params.name;
  return null;
}

export function decodedBody(node) {
  const cte = (getHeader(node.headers, 'Content-Transfer-Encoding') || '7bit').trim().toLowerCase();
  if (cte === 'base64') return base64Decode(node.body.replace(/\s+/g, ''));
  if (cte === 'quoted-printable') return decodeQuotedPrintable(node.body);
  return new TextEncoder().encode(node.body);
}
