import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, extractIps, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'ip_sb';

async function query(ip) {
  const { data } = await fetchJson(`https://api.ip.sb/geoip/${encodeURIComponent(ip)}`, { headers: { Accept: 'application/json' } });
  return pruneEmpty({
    country: data?.country,
    country_code: data?.country_code,
    region: data?.region,
    region_code: data?.region_code,
    city: data?.city,
    postal_code: data?.postal_code,
    continent_code: data?.continent_code,
    latitude: data?.latitude,
    longitude: data?.longitude,
    timezone: data?.timezone,
    utc_offset_seconds: data?.offset,
    asn: data?.asn,
    asn_organization: data?.asn_organization,
    isp: data?.isp,
    organization: data?.organization,
  });
}

export async function testIpSbConnection() {
  try { await query('8.8.8.8'); return { ok: true, message: 'Connected to IP.SB.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

// Conservative per-run ceiling protects free endpoints against unintentional flooding.
const DEFAULT_LIMIT = 30;
async function constrainedMap(input, queryFn) {
  const count = extractIps(input).length;
  if (count > DEFAULT_LIMIT) throw new Error(`This provider is limited by HexSpindle to ${DEFAULT_LIMIT} IPs per run (requested ${count}). Use a cached/local data source or split your list.`);
  return mapIps(input, queryFn, { delayMs: 750 });
}

module(
  'IP.SB GeoIP',
  'Free browser-facing IPv4/IPv6 GeoIP enrichment from IP.SB with location, timezone, ASN, ISP and organization. The provider explicitly supports CORS and requires no key. IP.SB publishes rate limits and may throttle shared/IP-based traffic. Default maximum 30 IPs/run and 750 ms spacing; a local MMDB is preferable for high-volume batches.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await constrainedMap(input, query), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['IP.SB', 'ip.sb', 'GeoIP'],
    connection: publicConnection(SERVICE, testIpSbConnection, 'No credential required. IP.SB explicitly supports browser CORS.'),
  }
);
