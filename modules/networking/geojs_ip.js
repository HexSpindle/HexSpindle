import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'geojs';

async function query(ip, includePtr) {
  const { data } = await fetchJson(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`, { headers: { Accept: 'application/json' } });
  let ptr;
  if (includePtr) {
    try {
      const r = await fetchJson(`https://get.geojs.io/v1/dns/ptr/${encodeURIComponent(ip)}.json`, { headers: { Accept: 'application/json' } });
      ptr = r.data?.ptr;
    } catch { /* PTR is optional */ }
  }
  return pruneEmpty({
    country: data?.country,
    country_code: data?.country_code,
    country_code3: data?.country_code3,
    continent_code: data?.continent_code,
    region: data?.region,
    city: data?.city,
    latitude: data?.latitude == null ? undefined : Number(data.latitude),
    longitude: data?.longitude == null ? undefined : Number(data.longitude),
    accuracy_km: data?.accuracy,
    timezone: data?.timezone,
    asn: data?.asn,
    organization_name: data?.organization_name,
    ptr,
  });
}

export async function testGeoJSConnection() {
  try { await query('8.8.8.8', false); return { ok: true, message: 'Connected to GeoJS.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'GeoJS IP Lookup',
  'CORS-enabled IPv4/IPv6 enrichment from GeoJS with location, ASN/organization, accuracy and optional PTR lookup. No API key required.',
  [A.boolean('Include PTR lookup', false), A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, includePtr, output) => enrichmentResult(SERVICE, await mapIps(input, ip => query(ip, includePtr)), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['GeoJS', 'Geo IP', 'PTR'],
    connection: publicConnection(SERVICE, testGeoJSConnection, 'No credential required. GeoJS explicitly supports CORS.'),
  }
);
