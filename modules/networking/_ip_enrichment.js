import { StructuredResult } from '../../core/registry.js';
import { isIp } from './_mmdb.js';
import { extractIpTokens } from './_geoip_normalize.js';

export const OUTPUT_FORMATS = ['JSON', 'JSON Lines', 'CSV'];

export function extractIps(input) {
  const text = String(input ?? '').trim();
  const structured = [];
  if (text) {
    try {
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.records) ? parsed.records : [parsed]);
      for (const row of rows) {
        const candidate = row && typeof row === 'object' ? (row.ip || row.indicator) : '';
        if (typeof candidate === 'string' && isIp(candidate) && !structured.includes(candidate)) structured.push(candidate);
      }
    } catch { /* plain text input */ }
  }
  const ips = structured.length ? structured : extractIpTokens(text, isIp);
  if (!ips.length) throw new Error('No valid IPv4 or IPv6 addresses were found in the input');
  return ips;
}

export const isIpv4 = ip => typeof ip === 'string' && isIp(ip) && !ip.includes(':');

// Remove fields which carry no information while preserving meaningful false/zero values.
// This keeps JSON/JSONL/parallel merged output compact and avoids dozens of blank fields.
export function pruneEmpty(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isNaN(value)) return undefined;
  if (typeof value === 'string') return value.trim() === '' ? undefined : value;
  if (Array.isArray(value)) {
    const cleaned = value.map(pruneEmpty).filter(v => v !== undefined);
    return cleaned.length ? cleaned : undefined;
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const cleaned = pruneEmpty(child);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return value; // false and 0 are intentionally retained
}

export function compactRows(rows) {
  return rows.map(row => pruneEmpty(row) || {}).filter(row => Object.keys(row).length);
}

function csvValue(value) {
  if (value == null) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows) {
  const cleaned = compactRows(rows);
  const columns = ['ip'];
  const seen = new Set(columns);
  for (const row of cleaned) {
    for (const key of Object.keys(row || {})) {
      if (!seen.has(key)) { seen.add(key); columns.push(key); }
    }
  }
  return [columns.join(','), ...cleaned.map(row => columns.map(key => csvValue(row?.[key])).join(','))].join('\n');
}

export function formatRows(rows, output = 'JSON') {
  const cleaned = compactRows(rows);
  if (output === 'CSV') return toCsv(cleaned);
  if (output === 'JSON Lines') return cleaned.map(row => JSON.stringify(row)).join('\n');
  return JSON.stringify(cleaned.length === 1 ? cleaned[0] : cleaned, null, 2);
}

export function enrichmentResult(provider, rows, output = 'JSON') {
  const cleaned = compactRows(rows);
  return new StructuredResult(formatRows(cleaned, output), {
    type: 'ip-enrichment',
    provider,
    rows: cleaned,
  });
}

export function epochIso(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return value ?? '';
  try { return new Date(n * 1000).toISOString(); } catch { return String(value); }
}

export async function fetchJson(url, options = {}, timeoutMs = 20000, allowStatuses = []) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal, credentials: 'omit' });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`Connection timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    if (error instanceof TypeError) throw new Error('Network request failed (service unavailable, blocked by CORS, or offline)');
    throw error;
  } finally { clearTimeout(timer); }

  let data = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { raw: text.replace(/\s+/g, ' ').trim().slice(0, 280) }; }
  }

  if (!response.ok && !allowStatuses.includes(response.status)) {
    const detail = data?.error?.message || data?.error || data?.errors?.[0]?.detail || data?.message || data?.raw || response.statusText;
    throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return { response, data };
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function mapIps(input, lookup, { delayMs = 0 } = {}) {
  const ips = extractIps(input);
  const rows = [];
  for (let i = 0; i < ips.length; i++) {
    if (i && delayMs > 0) await wait(delayMs);
    const ip = ips[i];
    try {
      const data = pruneEmpty(await lookup(ip));
      rows.push(pruneEmpty({ ip, ...(data || {}) }) || { ip });
    } catch (error) {
      rows.push({ ip, error: error?.message || String(error) });
    }
  }
  return rows;
}

export const parallelIpOptions = provider => ({
  text: true,
  net: true,
  parallelSafe: true,
  parallelGroup: 'ip-enrichment',
  parallelProvider: provider,
});

export function credentialConnection(id, label, test, help = '') {
  return { id, label, type: 'password', required: true, placeholder: `Enter ${label}`, help, test };
}

export function publicConnection(id, test, help = '') {
  return { id, label: 'Connection', type: 'none', required: false, help, test };
}
