const td = new TextDecoder();
const te = new TextEncoder();

export function textInput(input) {
  return typeof input === 'string' ? input : td.decode(input);
}

export function output(value) {
  return te.encode(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}

export function parseIndicators(input) {
  const text = textInput(input).trim();
  if (!text) return [];
  try {
    const value = JSON.parse(text);
    const found = [];
    const visit = v => {
      if (typeof v === 'string') found.push(v);
      else if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') {
        if (typeof v.indicator === 'string') found.push(v.indicator);
        else if (typeof v.ip === 'string') found.push(v.ip);
        else Object.values(v).forEach(visit);
      }
    };
    visit(value);
    const ips = found.filter(isIp);
    if (ips.length) return [...new Set(ips)];
  } catch {}
  const tokens = text.split(/[\s,;|]+/).map(s => s.trim().replace(/^[\[\("'`]+|[\]\)"'`,]+$/g, '')).filter(Boolean);
  return [...new Set(tokens.filter(isIp))];
}

export function isIp(s) {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(s)) return s.split('.').every(n => +n >= 0 && +n <= 255);
  return s.includes(':') && /^[0-9a-f:.%]+$/i.test(s);
}

export function recordsFromInput(input) {
  const text = textInput(input).trim();
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.every(x => x && typeof x === 'object' && (x.indicator || x.ip))) {
        return parsed.map(x => ({
          ...x,
          indicator: x.indicator || x.ip,
          type: x.type || ((x.indicator || x.ip).includes(':') ? 'ipv6' : 'ipv4'),
          enrichment: x.enrichment && typeof x.enrichment === 'object' ? x.enrichment : {},
        }));
      }
    } catch {}
  }
  return parseIndicators(input).map(ip => ({ indicator: ip, type: ip.includes(':') ? 'ipv6' : 'ipv4', enrichment: {} }));
}

export function providerResult(provider, ip, data, error = null) {
  return {
    status: error ? 'error' : 'success',
    queried_at: new Date().toISOString(),
    provider,
    ...(error ? { error: { message: String(error) } } : { data }),
  };
}

export function mergeProvider(input, provider, results) {
  const records = recordsFromInput(input);
  return output(records.map(r => ({
    ...r,
    enrichment: { ...r.enrichment, [provider]: results.get(r.indicator) || providerResult(provider, r.indicator, null, 'No result') },
  })));
}

export async function fetchJson(url, options = {}, timeoutMs = 30000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: ac.signal, cache: 'no-store' });
    let body = null;
    const raw = await response.text();
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = { raw }; }
    if (!response.ok) {
      const msg = body?.errors?.[0]?.detail || body?.error?.message || body?.message || body?.error || `HTTP ${response.status}`;
      const e = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      e.status = response.status; e.body = body; throw e;
    }
    return { body, response };
  } finally { clearTimeout(timer); }
}

export async function mapLimit(items, limit, fn) {
  const out = new Map(); let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++, key = items[i];
      try { out.set(key, await fn(key)); }
      catch (e) { out.set(key, { __error: e?.message || String(e) }); }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, worker));
  return out;
}

export function requireValue(v, label) {
  v = String(v || '').trim();
  if (!v) throw new Error(`${label} is not configured`);
  return v;
}

export function connectionError(e) {
  if (e?.name === 'AbortError') return 'Connection timed out';
  if (e instanceof TypeError && /fetch/i.test(e.message)) return 'Browser blocked the request or the service is unreachable (CORS/network error)';
  return e?.message || String(e);
}
