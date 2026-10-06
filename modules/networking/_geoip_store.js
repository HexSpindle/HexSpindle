import { MmdbReader } from './_mmdb.js';

const bundles = new Map();
let seq = 0;

export function providerFrom(type, description = {}) {
  const s = `${type} ${Object.values(description || {}).join(' ')}`.toLowerCase();
  if (/ip2location|ip2proxy/.test(s)) return 'IP2Location';
  if (/ipinfo/.test(s)) return 'IPinfo';
  if (/db-ip|dbip/.test(s)) return 'DB-IP';
  if (/geolite|geoip|maxmind/.test(s)) return 'MaxMind';
  return 'MMDB';
}
export function roleFrom(type) {
  const s = String(type).toLowerCase();
  if (/proxy|privacy|anonymous|risk/.test(s)) return 'proxy';
  if (/asn|isp|carrier/.test(s)) return 'asn';
  if (/city/.test(s)) return 'city';
  if (/country/.test(s)) return 'country';
  return 'generic';
}
export function loadGeoIpBundle(fileEntries) {
  if (!fileEntries?.length) throw new Error('Select at least one .mmdb file');
  const dbs = fileEntries.map((f, i) => {
    const reader = new MmdbReader(f.bytes);
    const m = reader.metadata;
    return {
      index: i, name: f.name || `database-${i + 1}.mmdb`, size: f.bytes.length,
      provider: providerFrom(m.databaseType, m.description), role: roleFrom(m.databaseType),
      databaseType: m.databaseType, buildEpoch: m.buildEpoch, ipVersion: m.ipVersion, reader,
    };
  });
  const id = `geoip:${Date.now().toString(36)}:${(++seq).toString(36)}`;
  bundles.set(id, { id, createdAt: Date.now(), dbs });
  return id;
}
export function getGeoIpBundle(id) { return bundles.get(id) || null; }
export function dropGeoIpBundle(id) { return bundles.delete(id); }
export function summarizeGeoIpBundle(id) {
  const b = bundles.get(id); if (!b) return null;
  return {
    id, count: b.dbs.length, bytes: b.dbs.reduce((n, d) => n + d.size, 0),
    databases: b.dbs.map(d => ({ name: d.name, size: d.size, provider: d.provider, role: d.role, databaseType: d.databaseType, buildEpoch: d.buildEpoch, ipVersion: d.ipVersion })),
  };
}
