// SPDX-License-Identifier: MIT
// Same-origin offline IOC enrichment using explicit exact-indicator / host matches.
// Bulk lookups use a prebuilt in-memory host index, not per-indicator HTTP requests.
import { feedManifest, readMirrorText, readMirrorCache, writeMirrorCache } from './_feed_mirror.js';
import { formatRows } from './_ip_enrichment.js';
import { StructuredResult } from '../../core/registry.js';

const hot = new Map(), pending = new Map();
const SOURCES = Object.freeze({ threatfox: 'abusech_threatfox', urlhaus: 'abusech_urlhaus' });
const MAX_INPUT_CHARS = 16_000_000, MAX_OUTPUT_CHARS = 64_000_000;

export function refang(value) {
  return String(value ?? '').trim()
    .replace(/\[\s*\.\s*\]|\(\s*\.\s*\)|\{\s*\.\s*\}/g, '.')
    .replace(/^hxxps:\/\//i, 'https://').replace(/^hxxp:\/\//i, 'http://')
    .replace(/\[:\]/g, ':').replace(/\[\/\]/g, '/');
}

export function indicatorKey(value) {
  const text = refang(value);
  if (!text || text.length > 8192) return '';
  if (/^https?:\/\//i.test(text)) {
    // Hostnames and schemes are case insensitive; URL paths, queries and fragments are not.
    try {
      const parsed = new URL(text);
      if (!['http:', 'https:'].includes(parsed.protocol)) return '';
      return parsed.href;
    } catch { return text; }
  }
  return text.toLowerCase().replace(/\.$/, '');
}

function ipv4(host) {
  const parts = host.split('.');
  return parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p) && +p <= 255);
}

// Index the URI hostname, rather than raw text, avoiding false positives in paths,
// query parameters and lookalike domains (evil-example.com != example.com).
export function indicatorHost(value) {
  const text = refang(value);
  if (!text || text.length > 8192 || /\s/.test(text)) return '';
  try {
    let host = '';
    if (/^https?:\/\//i.test(text)) host = new URL(text).hostname;
    else if (/^\[[0-9a-f:.]+\](?::\d{1,5})?$/i.test(text)) host = new URL('http://' + text).hostname;
    else if (/^[0-9a-f:]+$/i.test(text) && text.includes(':')) host = new URL('http://[' + text + ']/').hostname;
    else if (/^(?:[^/:?#]+)(?::\d{1,5})?$/.test(text)) host = new URL('http://' + text).hostname;
    host = host.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    if (ipv4(host) || (host.includes(':') && /^[0-9a-f:]+$/.test(host))) return host;
    if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(host) && !host.split('.').some(x => x.startsWith('-') || x.endsWith('-'))) return host;
  } catch { /* invalid URL or hostname */ }
  return '';
}

function indicatorFromObject(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  return [item.indicator, item.ip, item.url, item.domain, item.ioc, item.ioc_value]
    .find(value => typeof value === 'string') || '';
}

// Understand multiline JSON arrays/objects and JSON Lines emitted by other operations.
// Never turn formatted JSON punctuation/keys into fake indicator queries.
export function parseIndicators(input) {
  const raw = String(input ?? '').trim();
  if (raw.length > MAX_INPUT_CHARS) throw new Error('Input exceeds 16 million characters. Split very large files into batches.');
  const collect = data => {
    const items = Array.isArray(data) ? data :
      Array.isArray(data?.records) ? data.records :
      Array.isArray(data?.rows) ? data.rows :
      Array.isArray(data?.results) ? data.results :
      Array.isArray(data?.indicators) ? data.indicators : [data];
    return items.map(indicatorFromObject).filter(Boolean);
  };
  let values = null;
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try { values = collect(JSON.parse(raw)); }
    catch { /* Could be newline-separated JSON objects */ }
  }
  if (values === null) {
    const lines = raw.split(/\r?\n/);
    const jsonLines = lines.filter(line => line.trim()).every(line => /^\s*\{/.test(line));
    if (jsonLines && lines.length) {
      try { values = lines.filter(line => line.trim()).flatMap(line => collect(JSON.parse(line))); }
      catch { /* Treat as plain input */ }
    }
    if (values === null) values = lines;
  }
  const result = [...new Set(values.map(x => String(x).trim()).filter(Boolean))];
  if (!result.length) throw new Error('Enter an IP, domain, URL, hash or a list of indicators');
  return result;
}

function buildHostIndex(rows) {
  const hosts = new Map();
  for (const [key, entries] of rows) {
    const host = indicatorHost(key);
    if (!host) continue;
    if (!hosts.has(host)) hosts.set(host, []);
    hosts.get(host).push(...entries);
  }
  // Reverse domain labels to support indexed subdomain prefix searches.
  const suffix = [...hosts.keys()].filter(h => !ipv4(h) && !h.includes(':'))
    .map(host => [host.split('.').reverse().join('.'), host])
    .sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  return { hosts, suffix };
}

export function parseIndex(text, expected = 'threatfox') {
  const rows = new Map(); let seen = 0;
  for (const line of String(text).split('\n')) {
    if (!line.trim()) continue;
    const item = JSON.parse(line);
    const key = indicatorKey(item.indicator);
    if (!key) continue;
    if (expected === 'urlhaus' && !/^https?:\/\//i.test(key)) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(item); // Don't silently discard reports for a repeated IOC.
    if (++seen > 1_500_000) throw new Error('Dataset entry safety limit exceeded');
  }
  if (!seen) throw new Error('Published IOC feed contains no recognized indicators');
  return rows;
}

export async function loadIndex(kind) {
  const id = SOURCES[kind]; if (!id) throw new Error('Unknown IOC feed');
  const manifest = await feedManifest();
  const info = manifest?.datasets?.[id];
  if (!info) throw new Error(`${kind} dataset not published. Check the feed manifest's unavailable status and the public-redistribution permission setting.`);
  const sha = info.sha256;
  if (hot.get(id)?.sha === sha) return hot.get(id);
  if (pending.has(id)) return pending.get(id);
  const job = (async () => {
    const cacheKey = `abusech:${id}`;
    const cached = await readMirrorCache(cacheKey);
    let rows;
    if (cached?.sha === sha && Array.isArray(cached.entries)) rows = new Map(cached.entries);
    else {
      const { text } = await readMirrorText(id, manifest, 140_000_000);
      rows = parseIndex(text, kind);
      await writeMirrorCache(cacheKey, { sha, entries: [...rows.entries()] });
    }
    const value = { sha, rows, ...buildHostIndex(rows), info };
    hot.set(id, value);
    return value;
  })().finally(() => pending.delete(id));
  pending.set(id, job); return job;
}

function subdomainHosts(index, domain) {
  if (ipv4(domain) || !domain.includes('.')) return [];
  const prefix = domain.split('.').reverse().join('.') + '.';
  const sorted = index.suffix;
  let left = 0, right = sorted.length;
  while (left < right) {
    const mid = (left + right) >>> 1;
    if (sorted[mid][0] < prefix) left = mid + 1;
    else right = mid;
  }
  const result = [];
  for (let i = left; i < sorted.length && sorted[i][0].startsWith(prefix); i++) result.push(sorted[i][1]);
  return result;
}

export function findMatches(index, input) {
  const exactKey = indicatorKey(input), host = indicatorHost(input);
  const matches = [], used = new Set();
  const add = (list, matchType) => {
    for (const item of list || []) {
      if (used.has(item)) continue;
      used.add(item);
      matches.push({ ...item, match_type: matchType });
    }
  };
  add(index.rows.get(exactKey), 'exact_indicator');
  if (host) {
    add(index.hosts.get(host), 'same_host');
    for (const child of subdomainHosts(index, host)) add(index.hosts.get(child), 'subdomain_host');
  }
  return matches;
}

export async function lookupAbusech(kind, input, output = 'JSON', onlyFound = true) {
  const tokens = parseIndicators(input);
  const index = await loadIndex(kind);
  const items = [];
  for (const indicator of tokens) {
    const matches = findMatches(index, indicator);
    if (onlyFound && !matches.length) continue;
    items.push({ indicator, found: matches.length > 0,
      source: kind === 'threatfox' ? 'ThreatFox' : 'URLhaus', matches,
      snapshot_retrieved_at: index.info.source_retrieved_at });
  }
  const rendered = formatRows(items, output);
  if (rendered.length > MAX_OUTPUT_CHARS) throw new Error('Output exceeds 64 million characters. Split the batch or narrow your host searches.');
  return new StructuredResult(rendered, {
    type: 'indicator-enrichment', provider: `abusech_${kind}`, rows: items,
  });
}
