import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1, base64Decode } from '../../core/util.js';

// RFC 5322 / MIME parsing with no external dependency. Returns a tree of parts.
function splitHeaders(block) {
  const headers = [];
  for (const line of block.replace(/\r\n/g, '\n').split('\n')) {
    if (/^[ \t]/.test(line) && headers.length) headers[headers.length - 1][1] += ' ' + line.trim();
    else { const c = line.indexOf(':'); if (c > 0) headers.push([line.slice(0, c).trim(), line.slice(c + 1).trim()]); }
  }
  return headers;
}
const get = (headers, name) => headers.find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];
const param = (value, name) => value && (new RegExp(`;\\s*${name}\\s*=\\s*"([^"]*)"`, 'i').exec(value)?.[1] ?? new RegExp(`;\\s*${name}\\s*=\\s*([^;\\s]+)`, 'i').exec(value)?.[1]);

// Decode RFC 2047 encoded words in header values (=?utf-8?B?...?= and =?utf-8?Q?...?=).
function decodeWords(value = '') {
  return value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, text) => {
    let bytes;
    if (enc.toUpperCase() === 'B') { try { bytes = base64Decode(text); } catch { return text; } }
    else bytes = Uint8Array.from(decodeQP(text.replace(/_/g, ' ')));
    try { return new TextDecoder(charset.trim() || 'utf-8').decode(bytes); } catch { return decodeLatin1(bytes); }
  });
}
function decodeQP(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(text.substr(i + 1, 2))) { out.push(parseInt(text.substr(i + 1, 2), 16)); i += 2; }
    else if (text[i] === '=' && (text[i + 1] === '\n' || text.substr(i + 1, 2) === '\r\n')) i += text[i + 1] === '\n' ? 1 : 2;
    else out.push(text.charCodeAt(i) & 255);
  }
  return out;
}
function decodeBody(body, encoding) {
  const e = (encoding || '').toLowerCase();
  if (e === 'base64') { try { return base64Decode(body.replace(/\s+/g, '')); } catch { return Uint8Array.from(body, c => c.charCodeAt(0) & 255); } }
  if (e === 'quoted-printable') return Uint8Array.from(decodeQP(body));
  return Uint8Array.from(body, c => c.charCodeAt(0) & 255);
}

function parsePart(raw) {
  const sep = /\r?\n\r?\n/.exec(raw);
  const headers = splitHeaders(sep ? raw.slice(0, sep.index) : raw);
  const body = sep ? raw.slice(sep.index + sep[0].length) : '';
  const contentType = get(headers, 'Content-Type') || 'text/plain';
  const part = { headers, contentType: contentType.split(';')[0].trim().toLowerCase(), charset: param(contentType, 'charset'), encoding: get(headers, 'Content-Transfer-Encoding'), disposition: (get(headers, 'Content-Disposition') || '').split(';')[0].trim().toLowerCase() || undefined, filename: decodeWords(param(get(headers, 'Content-Disposition'), 'filename') || param(contentType, 'name')) };
  if (part.contentType.startsWith('multipart/')) {
    const boundary = param(contentType, 'boundary');
    part.children = [];
    if (boundary) {
      const pieces = body.split(new RegExp(`\r?\n?--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:--)?[ \t]*\r?\n?`));
      for (const piece of pieces.slice(1, -1)) if (piece.trim()) part.children.push(parsePart(piece));
    }
  } else {
    part.bytes = decodeBody(body, part.encoding);
  }
  return part;
}

module('Parse EML',
  'Parses an email message file (.eml, or a raw RFC 5322 / MIME message) into its headers, body parts and attachments. '
  + 'Decodes encoded-word headers (=?utf-8?B?…?=), walks multipart bodies, and decodes Base64 and quoted-printable parts. '
  + 'Shows the key headers, the authentication results (SPF / DKIM / DMARC if present), the part tree and each attachment with its name, type and size; '
  + 'the "Attachment" output extracts one attachment\'s bytes.',
  [A.select('Output', ['Summary', 'Headers (JSON)', 'Text body', 'HTML body', 'Attachment']), A.number('Attachment number', 1, 1)],
  (data, output, attachmentNumber) => {
    const root = parsePart(decodeLatin1(data));
    const parts = [];
    (function walk(p) { if (p.children) p.children.forEach(walk); else parts.push(p); })(root);
    const attachments = parts.filter(p => p.disposition === 'attachment' || (p.filename && p.disposition !== 'inline'));
    if (output === 'Headers (JSON)') return JSON.stringify(Object.fromEntries(root.headers.map(([k, v]) => [k, decodeWords(v)])), null, 2);
    if (output === 'Text body') { const b = parts.find(p => p.contentType === 'text/plain'); if (!b) throw new Error('No text/plain body found'); return new TextDecoder(b.charset || 'utf-8').decode(b.bytes); }
    if (output === 'HTML body') { const b = parts.find(p => p.contentType === 'text/html'); if (!b) throw new Error('No text/html body found'); return new TextDecoder(b.charset || 'utf-8').decode(b.bytes); }
    if (output === 'Attachment') { const a = attachments[Math.max(0, Math.trunc(attachmentNumber) - 1)]; if (!a) throw new Error(`There is no attachment ${attachmentNumber} (found ${attachments.length})`); return a.bytes; }
    const lines = ['Email message'];
    for (const h of ['From', 'To', 'Cc', 'Date', 'Subject', 'Message-ID', 'Reply-To', 'Return-Path', 'X-Mailer', 'User-Agent']) { const v = get(root.headers, h); if (v) lines.push(`${h}: ${decodeWords(v)}`); }
    const auth = get(root.headers, 'Authentication-Results'); if (auth) lines.push(`Authentication-Results: ${auth}`);
    const received = root.headers.filter(([k]) => k.toLowerCase() === 'received'); if (received.length) lines.push(`Received hops: ${received.length}`);
    lines.push('', 'Body parts:');
    (function tree(p, depth) { lines.push(`${'  '.repeat(depth + 1)}${p.contentType}${p.filename ? ` "${p.filename}"` : ''}${p.encoding ? ` [${p.encoding}]` : ''}${p.bytes ? ` (${p.bytes.length} bytes)` : ''}`); if (p.children) p.children.forEach(c => tree(c, depth + 1)); })(root, 0);
    lines.push('', attachments.length ? `Attachments (${attachments.length}):` : 'No attachments.');
    attachments.forEach((a, i) => lines.push(`  ${i + 1}. ${a.filename || '(unnamed)'} — ${a.contentType}, ${a.bytes.length} bytes`));
    return lines.join('\n');
  }, { aliases: ['eml', 'email', 'mime', 'message', 'rfc822', 'rfc5322'] });
