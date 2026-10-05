import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { encodeUtf8, base64Encode } from '../../core/util.js';

const OUTPUTS = ['Body', 'Headers', 'Headers + body', 'Summary (status, timing, redirects, TLS)', 'JSON report'];
const BODY_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function parseHeaderLines(text) {
  const h = {};
  for (const line of text.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    h[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return h;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function once(method, url, headers, body, timeoutMs, maxBytes, follow) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const t0 = performance.now();
  let resp;
  try {
    resp = await fetch(url, { method, headers, body, redirect: follow ? 'follow' : 'manual', credentials: 'omit', signal: ac.signal });
  } finally { clearTimeout(timer); }
  const tFirst = performance.now();
  if (resp.type === 'opaqueredirect') {
    return { opaque: true, status: 0, statusText: '', headers: [], body: new Uint8Array(0), url: resp.url || url, redirected: false, connectMs: 0, ttfbMs: tFirst - t0, downloadMs: 0 };
  }
  const reader = resp.body ? resp.body.getReader() : null;
  const chunks = [];
  let total = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) { reader.cancel(); throw new Error(`Response larger than the ${Math.round(maxBytes / 1048576)} MB limit (raise 'Max response size' or use 'Save response to file')`); }
      chunks.push(value);
    }
  }
  const tEnd = performance.now();
  const bytes = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { bytes.set(c, off); off += c.length; }
  const hdrs = [];
  resp.headers.forEach((v, k) => hdrs.push([k, v]));
  return {
    opaque: false, status: resp.status, statusText: resp.statusText, headers: hdrs, body: bytes,
    url: resp.url || url, redirected: resp.redirected, connectMs: 0, ttfbMs: tFirst - t0, downloadMs: tEnd - tFirst,
  };
}

function triggerDownload(bytes, filename) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return false;
  const blob = new Blob([bytes]);
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href; a.download = filename || 'response.bin';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
  return true;
}

module('HTTP request', 'Full-featured HTTP(S) client: auth, cookies, redirects, gzip/deflate, retries and timing details (TLS verification, a custom proxy and the exact redirect/byte-level details are not available from a browser sandbox - see the op\'s notes). Runs only when you press BAKE.',
  [A.select('Method', ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']), A.string('URL', 'https://'),
    A.area('Headers', '', 'One per line, e.g. User-Agent: Mozilla/5.0'), A.select('Output', OUTPUTS), A.number('Timeout (s)', 30, 1, 300),
    A.boolean('Verify TLS certificate', true), A.select('Authentication', ['None', 'Basic (user:password)', 'Bearer token']), A.string('Credentials', '', 'user:password, or the token'),
    A.string('Cookies', '', 'name=value; name2=value2'), A.boolean('Follow redirects', true), A.number('Max redirects', 10, 0, 50),
    A.string('Proxy', '', 'Not supported from a browser - ignored'), A.boolean('Decompress gzip / deflate', true), A.number('Max response size (MB)', 50, 1, 1024), A.number('Retries on connection errors', 0, 0, 10),
    A.string('Save response to file', '', 'Triggers a browser download instead of streaming to a server-side folder')],
  async (data, method, url, headersText, output, timeout, _verify, auth, creds, cookies, follow, maxRedirects, _proxy, _decompress, maxMb, retries, saveTo = '') => {
    if (!OUTPUTS.includes(output)) output = String(output).toLowerCase() === 'true' ? OUTPUTS[2] : OUTPUTS[0];
    const h = parseHeaderLines(headersText);
    const low = new Set(Object.keys(h).map(k => k.toLowerCase()));
    if (!low.has('user-agent')) h['User-Agent'] = 'Mozilla/5.0 (compatible; HexSpindle/1.0)';
    if (!low.has('accept')) h.Accept = '*/*';
    if (auth.startsWith('Basic') && creds) h.Authorization = 'Basic ' + base64Encode(encodeUtf8(creds));
    else if (auth.startsWith('Bearer') && creds) h.Authorization = 'Bearer ' + creds;
    if (cookies) h.Cookie = cookies;
    const body = (BODY_METHODS.includes(method) && data && data.length) ? data : null;
    const maxBytes = maxMb * 1048576;
    const timeoutMs = timeout * 1000;

    let r, lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try { r = await once(method, url.trim(), h, body, timeoutMs, maxBytes, follow); break; }
      catch (e) {
        lastErr = e;
        if (attempt < retries) await sleep(Math.min(2 ** attempt * 400, 4000));
      }
    }
    if (!r) throw lastErr;

    const headPairs = r.headers;
    const ctype = (headPairs.find(([k]) => k.toLowerCase() === 'content-type') || [, ''])[1];
    const headBlock = `HTTP/1.1 ${r.status} ${r.statusText}\n` + headPairs.map(([k, v]) => `${k}: ${v}\n`).join('');
    const total = r.connectMs + r.ttfbMs + r.downloadMs;

    if (output === 'Body') {
      if (saveTo.trim()) { const ok = triggerDownload(r.body, saveTo.trim()); return ok ? `Downloaded ${r.body.length.toLocaleString('en-US')} bytes as ${saveTo.trim()}` : r.body; }
      return r.body;
    }
    if (output === 'Headers') return headBlock + (r.opaque ? '\n(opaque redirect response - a browser cannot expose a cross-origin redirect\'s status/headers; this request followed it automatically instead)\n' : '');
    if (output === 'Headers + body') return concatHeaderBody(headBlock, r.body);

    const report = {
      url: url.trim(), final_url: r.url, status: r.status, reason: r.statusText, content_type: ctype, body_bytes: r.body.length,
      redirected: r.redirected, timing_ms: { total: round1(total), connect: round1(r.connectMs), first_byte: round1(r.ttfbMs), download: round1(r.downloadMs) },
      headers: headPairs, note: 'TLS certificate details, a custom proxy, true on-the-wire byte counts and the per-hop redirect chain are not available from a browser sandbox.',
    };
    if (output === 'JSON report') {
      try { report.body = new TextDecoder('utf-8', { fatal: true }).decode(r.body.subarray(0, 1000000)); }
      catch { report.body = null; report.body_base64 = base64Encode(r.body.subarray(0, 1000000)); }
      return report;
    }
    const lines = [`${r.status} ${r.statusText}  (HTTP)`, `URL: ${r.url}`, `Content-Type: ${ctype || '-'}`, `Size: ${r.body.length.toLocaleString('en-US')} bytes`,
      `Timing: total ${total.toFixed(0)} ms | first byte ${r.ttfbMs.toFixed(0)} | download ${r.downloadMs.toFixed(0)}`];
    if (r.redirected && r.url !== url.trim()) lines.push(`Redirected to: ${r.url}  (per-hop chain not available from a browser)`);
    return lines.join('\n');

    function round1(n) { return Math.round(n * 10) / 10; }
    function concatHeaderBody(head, bodyBytes) {
      const headBytes = encodeUtf8(head + '\n');
      const out = new Uint8Array(headBytes.length + bodyBytes.length);
      out.set(headBytes, 0); out.set(bodyBytes, headBytes.length);
      return out;
    }
  }, { net: true });
