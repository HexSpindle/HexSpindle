import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, mapIps, parallelIpOptions, publicConnection } from './_ip_enrichment.js';

const SERVICE = 'sans_isc';
const API = 'https://isc.sans.edu/api';
const HEADERS = { Accept: 'application/json' };

async function query(ip) {
  const { data } = await fetchJson(`${API}/ip/${encodeURIComponent(ip)}?json`, { headers: HEADERS });
  return data;
}

export async function testSANSISCConnection() {
  try {
    await query('8.8.8.8');
    return { ok: true, message: 'Connected to SANS ISC.' };
  } catch (error) {
    return { ok: false, message: error?.message || String(error) };
  }
}

const numeric = value => value === null || value === undefined || value === '' ? undefined : Number(value);

function parse(payload) {
  const data = payload && typeof payload === 'object' ? (payload.ip || payload) : {};
  const feeds = data?.threatfeeds;
  const feedNames = feeds && typeof feeds === 'object' && !Array.isArray(feeds) ? Object.keys(feeds) : [];
  return {
    number: data?.number,
    country: data?.country,
    count: numeric(data?.count),
    attacks: numeric(data?.attacks),
    maxdate: data?.maxdate,
    mindate: data?.mindate,
    updated: data?.updated,
    comment: data?.comment,
    maxrisk: data?.maxrisk,
    abuse_contact: data?.abusecontact || data?.asabusecontact,
    asn: data?.as,
    as_name: data?.asname,
    as_country: data?.ascountry,
    as_size: data?.assize,
    network: data?.network,
    threatfeed_count: feeds == null ? undefined : feedNames.length,
    threatfeed_names: feedNames,
    threatfeeds: feeds,
  };
}

module(
  'SANS ISC IP',
  'Query the SANS Internet Storm Center / DShield IP API for observations, attack counts, risk, ASN/network metadata, abuse contact information, and threat-feed indicators. No credential is required. Direct browser access depends on the service allowing the request through CORS.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => {
    const rows = await mapIps(input, async ip => parse(await query(ip)));
    return enrichmentResult(SERVICE, rows, output);
  },
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['SANS', 'ISC', 'Internet Storm Center', 'DShield'],
    connection: publicConnection(SERVICE, testSANSISCConnection,
      'No credentials required. Test checks direct browser connectivity to the SANS ISC API.'),
  }
);
