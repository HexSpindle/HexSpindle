// SPDX-License-Identifier: MIT
// Optional publicly-distributed GeoLite2 City MMDB, only if MaxMind redistribution
// rights were explicitly acknowledged during server-side publication.
import { feedManifest, openMirrorStream } from './_feed_mirror.js';
import { MmdbReader } from './_mmdb.js';
const DATASET = 'maxmind_geolite2_city';
const LIMIT = 150 * 1024 * 1024;
let current = null, pending = null;

export async function loadPublicGeoLiteCity() {
  const manifest = await feedManifest();
  const info = manifest?.datasets?.[DATASET];
  if (!info) return null; // Local user-provided files remain the default without permission.
  if (current?.sha === info.sha256) return current.db;
  if (pending?.sha === info.sha256) return pending.promise;
  const job = (async () => {
    const { stream } = await openMirrorStream(DATASET, manifest);
    const reader = stream.getReader();
    const chunks = []; let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > LIMIT) throw new Error('GeoLite2 City download exceeds 150 MiB');
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    if (size !== info.raw_bytes) throw new Error('GeoLite2 City decompressed byte count mismatch');
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
    if (!globalThis.crypto?.subtle) throw new Error('Secure browser context required for feed verification');
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
    const sha = [...digest].map(x=>x.toString(16).padStart(2,'0')).join('');
    if (sha !== info.sha256) throw new Error('GeoLite2 City SHA-256 mismatch');
    const mmdb = new MmdbReader(bytes);
    if (mmdb.metadata.databaseType !== 'GeoLite2-City') throw new Error('Published City MMDB type mismatch');
    if (Number(mmdb.metadata.buildEpoch) !== Date.parse(info.database_build_at)/1000)
      throw new Error('Published City MMDB build timestamp does not match manifest');
    const db = { name: info.database_name || 'GeoLite2-City.mmdb',
      size, reader:mmdb, provider:'MaxMind',role:'city',databaseType:'GeoLite2-City',
      buildEpoch:mmdb.metadata.buildEpoch,ipVersion:mmdb.metadata.ipVersion };
    current={sha,db}; return db;
  })().finally(()=>{pending=null;});
  pending={sha:info.sha256,promise:job};return job;
}
