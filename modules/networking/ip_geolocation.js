import { module } from './_cat.js';
import { A, StructuredResult } from '../../core/registry.js';
import { getGeoIpBundle } from './_geoip_store.js';
import { isIp } from './_mmdb.js';
import { normalizeGeoIpRecord, extractIpTokens } from './_geoip_normalize.js';

/* normalization lives in _geoip_normalize.js so it can be tested independently */
function mergeNormalized(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (k === 'provider') continue;
    if (v !== null && v !== '' && dst[k] == null) dst[k] = v;
  }
}
const extractIps = text => {
  const source = String(text ?? '').trim();
  if (source) {
    try {
      const parsed = JSON.parse(source);
      const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.records) ? parsed.records : [parsed]);
      const ips = [];
      for (const row of rows) {
        const ip = row && typeof row === 'object' ? (row.ip || row.indicator) : '';
        if (typeof ip === 'string' && isIp(ip) && !ips.includes(ip)) ips.push(ip);
      }
      if (ips.length) return ips;
    } catch { /* plain text input */ }
  }
  return extractIpTokens(source, isIp);
};
function toCsv(rows) {
  const cols = ['ip','country','country_code','continent','continent_code','region','region_code','city','postal_code','latitude','longitude','accuracy_radius_km','timezone','asn','as_name','as_domain','isp','connection_type','usage_type','as_type','proxy_type','is_proxy','proxy_provider','last_seen_days','threat','fraud_score','is_anonymous','is_anycast','is_hosting','is_mobile','is_satellite','is_relay','is_vpn','is_tor','is_public_proxy','is_residential_proxy','matched_databases'];
  const q = v => { const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\n');
}

module(
  'IP GeoLocation',
  'Look up IPv4/IPv6 addresses in one or more local MaxMind DB (.mmdb) files. Database type/provider is detected from MMDB metadata, not filenames, and provider-specific records are normalized by schema. Supports complementary City/Country/ASN/ISP/Proxy databases in one bundle.',
  [
    A.files('MMDB databases', '.mmdb,.MMDB', true, 'Select one or more DB-IP, IP2Location/IP2Proxy, IPinfo, MaxMind GeoLite2/GeoIP2, or other MaxMind DB-compatible files'),
    A.select('Output', ['JSON', 'JSON Lines', 'CSV'], 'JSON'),
    A.boolean('Include raw records', false),
  ],
  (input, bundleId, output, includeRaw) => {
    const bundle = getGeoIpBundle(bundleId);
    if (!bundle) throw new Error('No MMDB databases are loaded for this recipe step. Re-select the database files.');
    const ips = extractIps(input);
    if (!ips.length) throw new Error('No valid IPv4 or IPv6 addresses were found in the input');
    const rows = ips.map(ip => {
      const row = { ip }, matches = [], raw = {};
      for (const db of bundle.dbs) {
        let record, prefixLength;
        try { [record, prefixLength] = db.reader.getWithPrefixLength(ip); } catch (e) { matches.push({ database: db.name, error: e.message }); continue; }
        if (!record) continue;
        const norm = normalizeGeoIpRecord(record, db);
        mergeNormalized(row, norm);
        matches.push({ database: db.name, provider: db.provider, role: db.role, database_type: db.databaseType, prefix_length: prefixLength });
        if (includeRaw) raw[db.name] = record;
      }
      row.matched_databases = matches.filter(m => !m.error).map(m => m.database);
      row.sources = matches;
      row.found = matches.some(m => !m.error);
      if (includeRaw) row.raw = raw;
      return row;
    });
    const rendered = output === 'CSV' ? toCsv(rows)
      : output === 'JSON Lines' ? rows.map(r => JSON.stringify(r)).join('\n')
        : JSON.stringify(rows.length === 1 ? rows[0] : rows, null, 2);
    return new StructuredResult(rendered, { type: 'ip-enrichment', provider: 'geoip', rows });
  },
  {
    text: true,
    aliases: ['GeoIP', 'GeoLite2', 'MMDB', 'IP2Location', 'IPinfo', 'DB-IP'],
    parallelSafe: true,
    parallelGroup: 'ip-enrichment',
    parallelProvider: 'geoip',
  }
);

export { normalizeGeoIpRecord, extractIps };
