// SPDX-License-Identifier: MIT
// Shared same-origin feed metadata, gzip streaming, IndexedDB cache.
// No external JS dependency and no cross-origin proxy.
const ROOT = new URL('../../', import.meta.url);
const MANIFEST = new URL('data/feeds/manifest.json', ROOT);
const DB_NAME = 'hexspindle-enrichment-mirror-v1';
const STORE = 'snapshots';
let manifestPromise, manifestUntil = 0, dbPromise;

export async function feedManifest(force = false) {
  if (!force && manifestPromise && Date.now() < manifestUntil) return manifestPromise;
  manifestUntil = Date.now() + 120000;
  manifestPromise = (async () => {
    let response;
    try { response = await fetch(MANIFEST, { cache: 'no-store', credentials: 'omit' }); }
    catch (error) { throw new Error(`HexSpindle feed manifest unavailable (${error?.message || 'network error'}). Run the GitHub Pages feed synchronization workflow.`); }
    if (!response.ok) throw new Error(`Feed manifest HTTP ${response.status}. Deploy the GitHub Pages feed-sync workflow first.`);
    const manifest = await response.json();
    if (manifest?.schema_version !== 1 || !manifest.datasets || typeof manifest.datasets !== 'object')
      throw new Error('Invalid feed manifest version or contents');
    return manifest;
  })().catch(e => { manifestUntil = 0; manifestPromise = null; throw e; });
  return manifestPromise;
}

export function getFeedInfo(manifest, kind) {
  const info = manifest?.datasets?.[kind];
  if (!info?.sha256 || !/^[a-f0-9]{64}$/i.test(info.sha256) || !/^data\/feeds\/[a-z0-9_.-]+\.gz$/i.test(info.path || ''))
    throw new Error(`Dataset ${kind} is missing or invalid in the published feed manifest`);
  return info;
}

export async function openMirrorStream(kind, manifest) {
  const info = getFeedInfo(manifest || await feedManifest(), kind);
  if (typeof DecompressionStream === 'undefined')
    throw new Error('Browser does not support gzip DecompressionStream; use an up-to-date browser that supports streaming decompression.');
  const url = new URL(info.path, ROOT);
  url.searchParams.set('v', info.sha256.slice(0, 16));
  const response = await fetch(url, { credentials: 'omit', cache: 'default' });
  if (!response.ok) throw new Error(`${kind} download failed: HTTP ${response.status}`);
  if (!response.body) throw new Error(`${kind} has no readable response stream`);
  if (+info.compressed_bytes && response.headers.get('content-length') &&
      +response.headers.get('content-length') !== +info.compressed_bytes)
    throw new Error(`${kind} compressed byte count differs from the published manifest`);
  return { info, stream: response.body.pipeThrough(new DecompressionStream('gzip')) };
}

export async function readMirrorText(kind, manifest, maxBytes = 80_000_000) {
  const { info, stream } = await openMirrorStream(kind, manifest);
  const reader = stream.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
  let parts = [], size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error(`${kind} uncompressed data exceeds the browser size limit`);
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
  } finally { reader.releaseLock(); }
  if (size !== info.raw_bytes) throw new Error(`${kind} decompressed byte count mismatch (${size} != ${info.raw_bytes})`);
  return { text: parts.join(''), info };
}

async function openDb() {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) dbPromise = new Promise(resolve => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}
export async function readMirrorCache(key) {
  const db = await openDb(); if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = db.transaction(STORE,'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
export async function writeMirrorCache(key, value) {
  const db = await openDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(value,key);
      tx.oncomplete = () => resolve(true); tx.onerror = () => resolve(false); tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

export async function mirrorStatus() {
  const manifest = await feedManifest();
  return {
    published_at: manifest.generated_at,
    datasets: Object.fromEntries(Object.entries(manifest.datasets).map(([id,d]) => [id, {
      source_updated_at: d.source_modified_at || null,
      source_retrieved_at: d.source_retrieved_at,
      bytes: d.raw_bytes, compressed_bytes: d.compressed_bytes, records: d.records,
      sha256: d.sha256, source: d.source_url,
    }])),
  };
}
