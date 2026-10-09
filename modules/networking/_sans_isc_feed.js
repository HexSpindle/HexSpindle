// SPDX-License-Identifier: MIT
// HexSpindle SANS ISC / DShield bulk-feed reader. No third-party JavaScript dependencies.
// Source attribution: SANS Technology Institute, Internet Storm Center (https://isc.sans.edu).
// SANS data is NOT bundled; refer to https://isc.sans.edu/feeds_doc.html for terms.
import { parseIp } from './_mmdb.js';

export const SANS_FEEDS = Object.freeze({
  intelfeed: Object.freeze({ label: 'Intelfeed JSON', url: 'https://isc.sans.edu/api/intelfeed?json' }),
  threatintel: Object.freeze({ label: 'Threatintel text', url: 'https://isc.sans.edu/feeds/threatintel.txt' }),
  daily_sources: Object.freeze({ label: 'Daily sources TSV', url: 'https://feeds.dshield.org/feeds/daily_sources' }),
});
export const SANS_ATTRIBUTION = 'SANS Technology Institute, Internet Storm Center — https://isc.sans.edu';
const DB = 'hexspindle-sans-feed-v1', STORE = 'feeds', TTL = 24 * 60 * 60 * 1000;
const MAX_BYTES = 200 * 1024 * 1024;
const MAX_ENTRIES = 3_000_000;
const hot = new Map(), inflight = new Map();
let dbPromise;

export function ipKey(ip) {
  const raw = parseIp(ip);
  return raw ? `${raw.length}:` + Array.from(raw, n => n.toString(16).padStart(2, '0')).join('') : null;
}
function sortableIp(ip) {
  // Older DShield text feeds represent IPv4 octets as zero-padded decimal.
  const s = String(ip || '').trim().replace(/^['"\[]+|['"\]]+$/g, '');
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s)) return s.split('.').map(n => String(Number(n))).join('.');
  return s;
}
function asIp(ip) { const value = sortableIp(ip); return ipKey(value) ? value : null; }
function isHeader(s) { return !s || /^\s*(?:#|;|\/\/)/.test(s); }

async function openDb() {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}
async function readStored(kind) {
  const db = await openDb(); if (!db) return null;
  return new Promise(resolve => {
    try { const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).get(kind);
      r.onsuccess = () => resolve(r.result || null); r.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function saveStored(kind, result) {
  const db = await openDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ ...result, persistent: true, rows: Array.from(result.rows.entries()) }, kind);
      tx.oncomplete = () => resolve(true); tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
function revive(raw) {
  if (!raw || !Array.isArray(raw.rows) || !raw.rows.length || !SANS_FEEDS[raw.kind]) return null;
  return { ...raw, rows: new Map(raw.rows) };
}

function addIntel(map, ip, desc) {
  const key = ipKey(ip); if (!key) return;
  if (!map.has(key)) {
    if (map.size >= MAX_ENTRIES) throw new Error('SANS feed exceeds maximum supported IP entries');
    map.set(key, { descriptions: [] });
  }
  const label = String(desc ?? '').trim().slice(0, 500);
  const row = map.get(key);
  if (label && !row.descriptions.includes(label) && row.descriptions.length < 40) row.descriptions.push(label);
}
function addThreat(map, ip, fields) {
  const key = ipKey(ip); if (!key) return;
  if (!map.has(key)) {
    if (map.size >= MAX_ENTRIES) throw new Error('SANS feed exceeds maximum supported IP entries');
    map.set(key, { labels: [] });
  }
  const row = map.get(key);
  for (const field of fields) {
    const label = String(field ?? '').trim().slice(0, 160);
    if (label && !row.labels.includes(label) && row.labels.length < 50) row.labels.push(label);
  }
}
function addDaily(map, parts) {
  const ip = asIp(parts[0]); if (!ip) return;
  const key = ipKey(ip);
  const port = parts[1]?.trim(), protocol = parts[2]?.trim();
  const reports = Number(parts[3]), targets = Number(parts[4]);
  if (!map.has(key)) {
    if (map.size >= MAX_ENTRIES) throw new Error('SANS feed exceeds maximum supported IP entries');
    map.set(key, { observations: 0, daily_reports: 0, daily_target_counts_sum: 0, ports: [], first_seen: '', last_seen: '' });
  }
  const row = map.get(key); row.observations++;
  if (Number.isFinite(reports) && reports >= 0) row.daily_reports += reports;
  if (Number.isFinite(targets) && targets >= 0) row.daily_target_counts_sum += targets;
  const p = port && /^(?:\d{1,5}|\*)$/.test(port) ? `${protocol || '?'}/${port}` : '';
  if (p && row.ports.length < 100 && !row.ports.includes(p)) row.ports.push(p);
  const first = parts[5]?.trim() || '', last = parts[6]?.trim() || '';
  if (first && (!row.first_seen || first < row.first_seen)) row.first_seen = first;
  if (last && (!row.last_seen || last > row.last_seen)) row.last_seen = last;
}

function parseDelimitedLine(kind, map, line) {
  if (isHeader(line)) return;
  // DShield publishes TSV for daily_sources. Threatintel is tolerant of TSV/CSV/space text.
  if (kind === 'daily_sources') {
    const parts = line.split('\t');
    if (parts.length >= 5) addDaily(map, parts);
    return;
  }
  let parts = line.includes('\t') ? line.split('\t') : line.includes(',') ? line.split(',') : line.trim().split(/\s+/);
  if (parts.length < 2) return;
  let pos = parts.findIndex((v, i) => i < 3 && asIp(v));
  if (pos === -1) return;
  const ip = asIp(parts[pos]);
  const labels = parts.filter((_, i) => i !== pos).map(x => x.trim()).filter(Boolean);
  addThreat(map, ip, labels);
}
function newAccumulator(kind) { return { kind, rows: new Map(), lines: 0, bytes: 0, tail: '', decoder: new TextDecoder() }; }
function append(acc, chunk) {
  acc.bytes += chunk.length;
  if (acc.bytes > MAX_BYTES) throw new Error('SANS feed is larger than the 200 MiB browser safety limit');
  const text = acc.tail + acc.decoder.decode(chunk, { stream: true });
  let from = 0, end;
  while ((end = text.indexOf('\n', from)) !== -1) {
    const line = text.slice(from, end).replace(/\r$/, '');
    acc.lines++;
    parseDelimitedLine(acc.kind, acc.rows, line);
    from = end + 1;
  }
  acc.tail = text.slice(from);
  if (acc.tail.length > 2_000_000) throw new Error('Malformed SANS feed (overlong line)');
}
function finish(acc) {
  const rem = acc.decoder.decode();
  if (rem) acc.tail += rem;
  if (acc.tail) { acc.lines++; parseDelimitedLine(acc.kind, acc.rows, acc.tail.replace(/\r$/, '')); }
  if (!acc.rows.size) throw new Error('No valid IP records found. Check the SANS feed type/format.');
  return acc.rows;
}

// Flexible support for SANS JSON responses: {intelfeed:[...]}, [...], or nested wrappers.
export function parseIntelJson(data) {
  const rows = new Map();
  const visited = new Set();
  function walk(v, depth = 0) {
    if (!v || depth > 6 || typeof v !== 'object' || visited.has(v)) return;
    visited.add(v);
    if (Array.isArray(v)) { for (const x of v) walk(x, depth + 1); return; }
    const ip = asIp(v.ip || v.ipaddress || v.source || v.number);
    if (ip) addIntel(rows, ip, v.description || v.label || v.feed || 'Notable IP');
    else for (const [k, value] of Object.entries(v)) {
      if (k !== 'metadata' && k !== 'meta') walk(value, depth + 1);
    }
  }
  walk(data);
  if (!rows.size) throw new Error('Intelfeed JSON contained no valid IP/description records');
  return rows;
}
export function parseFeedBytes(kind, bytes) {
  if (!SANS_FEEDS[kind]) throw new Error('Unsupported SANS feed type');
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!u.length || u.length > MAX_BYTES) throw new Error('Empty or oversized SANS feed (maximum 200 MiB)');
  if (kind === 'intelfeed') return parseIntelJson(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(u)));
  const acc = newAccumulator(kind); // Chunk to avoid one enormous decoded string.
  for (let i = 0; i < u.length; i += 512 * 1024) append(acc, u.subarray(i, i + 512 * 1024));
  return finish(acc);
}
async function fetchFeed(kind) {
  const meta = SANS_FEEDS[kind];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(meta.url, { credentials: 'omit', signal: controller.signal, headers: { Accept: kind === 'intelfeed' ? 'application/json' : 'text/plain' } });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${meta.url}`);
    const size = Number(response.headers.get('content-length'));
    if (size > MAX_BYTES) throw new Error('SANS feed exceeds 200 MiB browser safety limit');
    let rows;
    if (kind === 'intelfeed') {
      const text = await response.text();
      if (text.length > MAX_BYTES) throw new Error('SANS Intelfeed exceeds 200 MiB limit');
      rows = parseIntelJson(JSON.parse(text));
    } else if (response.body?.getReader) {
      const acc = newAccumulator(kind), reader = response.body.getReader();
      try { while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        append(acc, value);
      } } finally { reader.releaseLock(); }
      rows = finish(acc);
    } else {
      rows = parseFeedBytes(kind, new Uint8Array(await response.arrayBuffer()));
    }
    const result = { kind, rows, storedAt: Date.now(), origin: 'remote', url: meta.url, persistent: false };
    result.persistent = await saveStored(kind, result);
    hot.set(kind, result);
    return result;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('SANS feed download exceeded 120 seconds');
    if (error instanceof TypeError) throw new Error(`Cannot download ${meta.url} from this browser (possibly CORS or offline). Download the feed manually, open it as HexSpindle input, and run "SANS ISC Import Feed".`);
    throw error;
  } finally { clearTimeout(timer); }
}
export async function importSansFeed(kind, bytes) {
  const rows = parseFeedBytes(kind, bytes);
  const result = { kind, rows, storedAt: Date.now(), origin: 'uploaded', url: SANS_FEEDS[kind].url, persistent: false };
  result.persistent = await saveStored(kind, result);
  hot.set(kind, result);
  return { kind, records: rows.size, cached_in_browser: result.persistent, imported_at: new Date(result.storedAt).toISOString(), source: result.url, attribution: SANS_ATTRIBUTION };
}

async function loadImpl(kind, mode) {
  let existing = hot.get(kind);
  if (!existing) {
    existing = revive(await readStored(kind));
    if (existing) hot.set(kind, existing);
  }
  if (mode === 'offline') {
    if (!existing) throw new Error(`No cached ${SANS_FEEDS[kind].label}. Download the feed, open it as HexSpindle input and run "SANS ISC Import Feed" first.`);
    return existing;
  }
  // User-provided datasets are intentionally not silently replaced by a remote copy.
  if (existing && (existing.origin === 'uploaded' || Date.now() - existing.storedAt < TTL)) return existing;
  try { return await fetchFeed(kind); }
  catch (error) { if (existing) return { ...existing, stale: true, refreshError: error.message }; throw error; }
}
export function getSansFeed(kind, mode = 'auto') {
  if (!SANS_FEEDS[kind]) return Promise.reject(new Error('Unsupported SANS feed'));
  const key = `${kind}|${mode}`;
  if (inflight.has(key)) return inflight.get(key);
  const promise = loadImpl(kind, mode).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function matchSansFeeds(ip, feeds) {
  const key = ipKey(ip);
  const matched = [];
  const combined = { ip, found: false, feed_checked: true, datasets_checked: feeds.map(f => f.kind), source: 'SANS Internet Storm Center / DShield' };
  if (!key) return combined;
  for (const feed of feeds) {
    const row = feed.rows.get(key);
    if (!row) continue;
    matched.push(feed.kind);
    combined.found = true;
    if (feed.kind === 'intelfeed') combined.intelfeed_descriptions = row.descriptions;
    else if (feed.kind === 'threatintel') combined.threatintel_labels = row.labels;
    else Object.assign(combined, row);
  }
  combined.datasets_matched = matched;
  return combined;
}

export function feedMetadata(feeds) {
  return feeds.map(f => ({ dataset: f.kind, records: f.rows.size, origin: f.origin,
    fetched_or_imported_at: new Date(f.storedAt).toISOString(), stale: !!f.stale,
    cached_in_browser: !!f.persistent, source_url: f.url, ...(f.refreshError ? { refresh_error: f.refreshError } : {}) }));
}
