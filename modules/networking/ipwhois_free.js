import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'ipwhois_free';

async function query(ip) {
  const { data } = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`, { headers: { Accept: 'application/json' } });
  if (data?.success === false) throw new Error(data?.message || 'ipwho.is lookup failed');
  return pruneEmpty({
    type: data?.type,
    continent: data?.continent,
    continent_code: data?.continent_code,
    country: data?.country,
    country_code: data?.country_code,
    region: data?.region,
    region_code: data?.region_code,
    city: data?.city,
    postal: data?.postal,
    latitude: data?.latitude,
    longitude: data?.longitude,
    timezone: data?.timezone?.id,
    timezone_offset: data?.timezone?.offset,
    asn: data?.connection?.asn,
    org: data?.connection?.org,
    isp: data?.connection?.isp,
    domain: data?.connection?.domain,
  });
}

export async function testIPWhoisFreeConnection() {
  try { await query('8.8.8.8'); return { ok: true, message: 'Connected to ipwho.is free endpoint.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'ipwho.is IP Lookup',
  'Keyless CORS-enabled IPv4/IPv6 geolocation and network enrichment from ipwho.is: country/region/city, coordinates, timezone, ASN, organization, ISP and domain. Free endpoint limits apply.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await mapIps(input, query), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['ipwhois.io', 'ipwho.is', 'IP Whois geolocation'],
    connection: publicConnection(SERVICE, testIPWhoisFreeConnection, 'No key required. The provider documents CORS support for browser requests.'),
  }
);
