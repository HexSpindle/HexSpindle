// SPDX-License-Identifier: MIT
// Optional IPinfo Lite CC BY-SA 4.0 dataset; attribution https://ipinfo.io.
// No token or IP list is sent by the browser when a published Lite snapshot is present.
import { MmdbReader } from './_mmdb.js';
import { feedManifest, getFeedInfo, openMirrorStream, readMirrorCache, writeMirrorCache } from './_feed_mirror.js';

let hot = null, pending = null;
const ID = 'ipinfo_lite';
const MAX_UNCOMPRESSED = 175 * 1024 * 1024;

export async function getLiteDataset() {
  const manifest = await feedManifest();
  if (!manifest.datasets?.[ID]) return null;
  const info = getFeedInfo(manifest, ID);
  if (hot?.sha === info.sha256) return hot;
  if (pending) return pending;
  pending = (async () => {
    const stored = await readMirrorCache(`ipinfo-lite:${info.sha256}`);
    if (stored?.bytes && stored.bytes.length === info.raw_bytes) {
      try {
        const cached = { reader: new MmdbReader(stored.bytes), sha: info.sha256, info };
        hot = cached; return cached;
      } catch { /* damaged local record; reload from publisher */ }
    }
    const { stream } = await openMirrorStream(ID, manifest);
    const reader = stream.getReader();
    const chunks = []; let total = 0;
    try {
      while (true) {
        const {done,value} = await reader.read(); if (done) break;
        total += value.byteLength;
        if (total > MAX_UNCOMPRESSED) throw new Error('IPinfo Lite decompressed file exceeds safety limit');
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    if (total !== info.raw_bytes) throw new Error('IPinfo Lite uncompressed length differs from manifest');
    const bytes = new Uint8Array(total); let off = 0;
    for (const part of chunks) { bytes.set(part, off); off += part.length; }
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      const hex = Array.from(digest, v => v.toString(16).padStart(2,'0')).join('');
      if (hex !== info.sha256) throw new Error('IPinfo Lite SHA-256 validation failed');
    }
    const dataset = { reader: new MmdbReader(bytes), sha: info.sha256, info };
    hot = dataset;
    await writeMirrorCache(`ipinfo-lite:${info.sha256}`, { bytes, storedAt: Date.now() });
    return dataset;
  })().finally(() => { pending = null; });
  return pending;
}

export function matchLite(ip, dataset) {
  if (!dataset) return null;
  const record = dataset.reader.get(ip);
  if (!record) return { source: 'IPinfo Lite (local)', found: false, snapshot: dataset.info.source_retrieved_at };
  return {
    source: 'IPinfo Lite (local)', found: true,
    country: record.country, country_code: record.country_code,
    continent: record.continent, continent_code: record.continent_code,
    asn: record.asn, as_name: record.as_name, as_domain: record.as_domain,
    snapshot: dataset.info.source_retrieved_at,
    attribution: 'IPinfo Lite — https://ipinfo.io (CC BY-SA 4.0)',
  };
}
