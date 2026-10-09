import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, extractIps, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'bgp_rpki_atlas';
const BASE = 'https://atlas.ipinfo.app/api/v2';

async function get(path, allowStatuses = []) {
  const { response, data } = await fetchJson(`${BASE}${path}`, { headers: { Accept: 'application/json' } }, 25000, allowStatuses);
  if (allowStatuses.includes(response.status) && response.status >= 400) return { unavailable: data?.error || `HTTP ${response.status}` };
  return data || {};
}

async function query(ip, includePrefixDetails) {
  const routing = await get(`/routing/ip/${encodeURIComponent(ip)}`);
  const most = Array.isArray(routing?.covering) ? routing.covering[0] : undefined;
  let prefixDetails;
  if (includePrefixDetails && most?.prefix) {
    prefixDetails = await get(`/routing/prefix/${encodeURIComponent(most.prefix)}`, [404]);
  }
  return pruneEmpty({
    routed: routing?.routed,
    moas: routing?.moas,
    origin_count: routing?.origin_count,
    most_specific_prefix: most?.prefix,
    origin_asn: most?.origin_asn,
    origin_name: most?.name,
    peers_seen: most?.peers_seen,
    rpki_state: most?.rpki_state,
    rpki_reason: most?.rpki_reason,
    irr_state: most?.irr_state,
    covering: routing?.covering,
    snapshot: routing?.snapshot,
    prefix_details: prefixDetails,
  });
}

export async function testAtlasConnection() {
  try { await get('/routing/ip/8.8.8.8'); return { ok: true, message: 'Connected to Atlas BGP/RPKI API.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

async function batchBGP(input, details) {
  const count=extractIps(input).length;
  if(count>50)throw new Error('Atlas BGP/RPKI is limited to 50 IPs per run by HexSpindle. No public full RPKI/peer/IRR snapshot is available for identical offline output.');
  return mapIps(input,ip=>query(ip,details),{delayMs:350});
}
module(
  'BGP / RPKI Intelligence',
  'Browser-native routing enrichment from Atlas: observed covering prefixes, origin ASN, peer visibility, MOAS indicator, RPKI route-origin state and IRR registration state. Optionally includes prefix-level less/more-specific routing details. No API key required. Default: prefix details off, 50 IPs/run maximum and 350 ms request spacing. RPKI/IRR states and peer visibility are live values and cannot be inferred from public RIR allocation snapshots.',
  [A.boolean('Include prefix routing details', false), A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, details, output) => enrichmentResult(SERVICE, await batchBGP(input, details), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['RPKI', 'BGP', 'IRR', 'Atlas', 'Route origin validation'],
    connection: publicConnection(SERVICE, testAtlasConnection, 'No credential required. atlas.ipinfo.app advertises CORS and no-auth access.'),
  }
);
