import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseMimeNode, walk, getHeader, getFilename, decodedBody, decodeRfc2047, decodeWithCharset, canonicalizeParamHeader } from './_mime.js';

const PARAM_HEADERS = new Set(['content-type', 'content-disposition']);

function ccFromBase64(data) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  data = data.replace(/[^A-Za-z0-9+/=]/g, '');
  const out = [];
  for (let i = 0; i < data.length;) {
    const e1 = alphabet.indexOf(data.charAt(i++) || null), e2 = alphabet.indexOf(data.charAt(i++) || null);
    const e3 = alphabet.indexOf(data.charAt(i++) || null), e4 = alphabet.indexOf(data.charAt(i++) || null);
    const c1 = (e1 << 2) | (e2 >> 4), c2 = ((e2 & 15) << 4) | (e3 >> 2), c3 = ((e3 & 3) << 6) | e4;
    if (c1 >= 0 && c1 < 256) out.push(c1);
    if (c2 >= 0 && c2 < 256 && e3 !== 64) out.push(c2);
    if (c3 >= 0 && c3 < 256 && e4 !== 64) out.push(c3);
  }
  return out;
}

function parseQEncodedWord(w) {
  let out = '';
  for (let i = 0; i < w.length; i++) {
    const c = w.charCodeAt(i);
    if (w[i] === '_') {
      out += ' ';
    } else if (w[i] === '=') {
      if (i + 2 >= w.length) throw new Error('Incorrectly Encoded Word');
      for (const part of w.substring(i + 1, i + 3).split(/[^a-f\d]|0x/gi)) {
        for (let j = 0; j < part.length; j += 2) out += String.fromCharCode(parseInt(part.substr(j, 2), 16));
      }
      i += 2;
    } else if ((c >= 0x20 && c <= 0x7e) || w[i] === '\n' || w[i] === '\r' || w[i] === '\t') {
      out += w[i];
    } else {
      throw new Error('Incorrectly Encoded Word');
    }
  }
  return out;
}

function convertFromCharset(charset, text) {
  const bytes = typeof text === 'string' ? Uint8Array.from(text, ch => ch.charCodeAt(0) & 0xff) : Uint8Array.from(text);
  charset = charset.toLowerCase();
  const parts = charset.split('-');
  if (charset === 'utf-8') return new TextDecoder('utf-8').decode(bytes);
  if (parts.length === 2 && charset === 'us-ascii') return String.fromCharCode(...bytes);
  if (parts.length === 3 && parts[0] === 'iso' && parts[1] === '8859') {
    const n = parseInt(parts[2], 10);
    if (n >= 1 && n <= 16) {
      if (n === 12) throw new Error('Unrecognized CP: 28602');
      const dec = n === 1 ? null : new TextDecoder(`iso-8859-${n}`);
      let out = '';
      for (const b of bytes) out += b < 0xa0 || !dec ? String.fromCharCode(b) : dec.decode(Uint8Array.of(b));
      return out;
    }
  }
  throw new Error('Unhandled Charset');
}

function decodeHeaders(headerString) {
  let i = headerString.indexOf('=?');
  if (i === -1) return headerString;
  let decoded = headerString.slice(0, i);
  let header = headerString.slice(i);
  let isBetweenWords = false;
  let start, cur, charset, encoding, j, end, text;
  for (;;) {
    start = header.indexOf('=?');
    if (start === -1) break;
    cur = start + 2;
    i = header.slice(cur).indexOf('?');
    if (i === -1) break;
    charset = header.slice(cur, cur + i);
    cur += i + 1;
    if (header.length < cur + 4) break;
    encoding = header[cur];
    cur += 1;
    if (header[cur] !== '?') break;
    cur += 1;
    j = header.slice(cur).indexOf('?=');
    if (j === -1) break;
    text = header.slice(cur, cur + j);
    end = cur + j + 2;
    if (encoding.toLowerCase() === 'b') {
      text = ccFromBase64(text);
    } else if (encoding.toLowerCase() === 'q') {
      text = parseQEncodedWord(text);
    } else {
      isBetweenWords = false;
      decoded += header.slice(0, start + 2);
      header = header.slice(start + 2);
    }
    if (start > 0 && (!isBetweenWords || header.slice(0, start).search(/\S/g) > -1)) decoded += header.slice(0, start);
    decoded += convertFromCharset(charset, text);
    header = header.slice(end);
    isBetweenWords = true;
  }
  if (header.length > 0) decoded += header;
  return decoded;
}

module('MIME Decoding', 'Decodes RFC 2047 MIME encoded-words (=?charset?B/Q?...?=) in text, or parses a whole MIME/email message: headers and each body part (decoding base64/quoted-printable automatically).',
  [A.boolean('Show raw headers', true), A.select('Mode', ['Decode encoded-words (RFC 2047)', 'Parse full message'])],
  (t, headers, mode = 'Decode encoded-words (RFC 2047)') => {
    if (mode !== 'Parse full message') return decodeHeaders(t.replace(/\r\n/g, '\n'));
    const root = parseMimeNode(t);
    const out = [];
    if (headers) {
      for (const [k, v] of root.headers) out.push(`${k}: ${PARAM_HEADERS.has(k.toLowerCase()) ? canonicalizeParamHeader(v) : decodeRfc2047(v)}`);
      out.push('');
    }
    if (root.isMulti) {
      let i = 0;
      for (const part of walk(root)) {
        const idx = i++;
        if (part.isMulti) continue;
        const fname = getFilename(part);
        out.push(`--- Part ${idx} (${part.type}${fname ? `, filename=${fname}` : ''}) ---`);
        try {
          const bytes = decodedBody(part);
          if (part.type.startsWith('text/')) out.push(decodeWithCharset(bytes, part.params.charset));
          else out.push(`<${bytes.length} bytes of binary content>`);
        } catch (e) {
          out.push(`<could not decode: ${e.message}>`);
        }
      }
    } else {
      const bytes = decodedBody(root);
      out.push(root.type.startsWith('text/') ? decodeWithCharset(bytes, root.params.charset) : `<${bytes.length} bytes of binary content>`);
    }
    return out.join('\n');
  }, { text: true });
