import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'ipinfo_io';

async function query(ip) {
  const { data } = await fetchJson(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, { headers: { Accept: 'application/json' } });
  return data || {};
}

function parse(data) {
  let latitude, longitude;
  if (typeof data?.loc === 'string') {
    const [lat, lon] = data.loc.split(',').map(Number);
    if (Number.isFinite(lat)) latitude = lat;
    if (Number.isFinite(lon)) longitude = lon;
  }
  let asn, as_name;
  if (typeof data?.org === 'string') {
    const m = data.org.match(/^(AS\d+)\s*(.*)$/i);
    if (m) { asn = m[1]; as_name = m[2]; }
    else as_name = data.org;
  }
  if (data?.asn && typeof data.asn === 'object') {
    asn = data.asn.asn || asn;
    as_name = data.asn.name || as_name;
  }
  return pruneEmpty({
    hostname: data?.hostname,
    city: data?.city,
    region: data?.region,
    country: data?.country,
    postal: data?.postal,
    timezone: data?.timezone,
    latitude,
    longitude,
    asn,
    as_name,
    as_domain: data?.asn?.domain,
    route: data?.asn?.route,
    as_type: data?.asn?.type,
    anycast: data?.anycast ?? data?.is_anycast,
    bogon: data?.bogon,
  });
}

export async function testIPInfoConnection() {
  try { await query('8.8.8.8'); return { ok: true, message: 'Connected to IPinfo anonymous endpoint.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'IPInfo.io Basic',
  'Query the IPinfo per-IP JSON endpoint without supplying a token. Anonymous responses can provide basic hostname, location and organization context, subject to IPinfo\'s current unauthenticated limits and field availability.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await mapIps(input, async ip => parse(await query(ip))), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['IPinfo', 'IPInfo.io'],
    connection: publicConnection(SERVICE, testIPInfoConnection, 'No token is sent. IPinfo may limit anonymous requests or fields.'),
  }
);
