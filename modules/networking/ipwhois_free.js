import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, extractIps, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

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

// Conservative per-run ceiling protects free endpoints against unintentional flooding.
const DEFAULT_LIMIT = 20;
async function constrainedMap(input, queryFn) {
  const count = extractIps(input).length;
  if (count > DEFAULT_LIMIT) throw new Error(`This provider is limited by HexSpindle to ${DEFAULT_LIMIT} IPs per run (requested ${count}). Use a cached/local data source or split your list.`);
  return mapIps(input, queryFn, { delayMs: 1100 });
}

module(
  'ipwho.is IP Lookup',
  'Keyless CORS-enabled IPv4/IPv6 geolocation and network enrichment from ipwho.is: country/region/city, coordinates, timezone, ASN, organization, ISP and domain. Free endpoint limits apply. ipwho.is free service has rate/usage limits and no public unrestricted complete bulk dataset. Default maximum 20 IPs/run, 1100 ms spacing; use local GeoIP MMDB for larger data.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await constrainedMap(input, query), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['ipwhois.io', 'ipwho.is', 'IP Whois geolocation'],
    connection: publicConnection(SERVICE, testIPWhoisFreeConnection, 'No key required. The provider documents CORS support for browser requests.'),
  }
);
