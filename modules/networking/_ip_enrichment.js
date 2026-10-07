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

function csvValue(value) {
  if (value == null) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows) {
  const columns = ['ip'];
  const seen = new Set(columns);
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      if (!seen.has(key)) { seen.add(key); columns.push(key); }
    }
  }
  return [columns.join(','), ...rows.map(row => columns.map(key => csvValue(row?.[key])).join(','))].join('\n');
}

export function formatRows(rows, output = 'JSON') {
  if (output === 'CSV') return toCsv(rows);
  if (output === 'JSON Lines') return rows.map(row => JSON.stringify(row)).join('\n');
  return JSON.stringify(rows.length === 1 ? rows[0] : rows, null, 2);
}

export function enrichmentResult(provider, rows, output = 'JSON') {
  return new StructuredResult(formatRows(rows, output), {
    type: 'ip-enrichment',
    provider,
    rows,
  });
}

export function epochIso(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return value ?? '';
  try { return new Date(n * 1000).toISOString(); } catch { return String(value); }
}

export async function fetchJson(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`Connection timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    if (error instanceof TypeError) throw new Error('Network request failed (service unavailable, blocked by CORS, or offline)');
    throw error;
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { raw: text.slice(0, 1000) }; }
  }

  if (!response.ok) {
    const detail = data?.error?.message || data?.error || data?.errors?.[0]?.detail || data?.message || data?.raw || response.statusText;
    throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return { response, data };
}

export async function mapIps(input, lookup) {
  const ips = extractIps(input);
  const rows = [];
  for (const ip of ips) {
    try {
      const data = await lookup(ip);
      rows.push({ ip, ...data });
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
  return {
    id,
    label,
    type: 'password',
    required: true,
    placeholder: `Enter ${label}`,
    help,
    test,
  };
}


export function publicConnection(id, test, help = '') {
  return {
    id,
    label: 'Connection',
    type: 'none',
    required: false,
    help,
    test,
  };
}
