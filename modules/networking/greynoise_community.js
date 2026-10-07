import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, isIpv4, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'greynoise_community';
const API = 'https://api.greynoise.io/v3/community';

async function query(ip) {
  if (!isIpv4(ip)) return { supported: false, message: 'GreyNoise Community accepts routable IPv4 addresses only.' };
  const { data } = await fetchJson(`${API}/${encodeURIComponent(ip)}`, { headers: { Accept: 'application/json' } }, 20000, [404]);
  return data || {};
}

function parse(data) {
  return pruneEmpty({
    noise: data?.noise,
    riot: data?.riot,
    classification: data?.classification,
    name: data?.name,
    last_seen: data?.last_seen,
    link: data?.link,
    message: data?.message,
    supported: data?.supported,
  });
}

export async function testGreyNoiseCommunityConnection() {
  try { await query('8.8.8.8'); return { ok: true, message: 'Connected to GreyNoise Community.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'GreyNoise Community',
  'Query the unauthenticated GreyNoise Community endpoint for routable IPv4 indicators. Returns whether an IP has been observed scanning the internet, RIOT status, classification, name and last-seen information. Anonymous lookup limits are intentionally small.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await mapIps(input, async ip => parse(await query(ip))), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['GreyNoise', 'RIOT', 'internet scanner'],
    connection: publicConnection(SERVICE, testGreyNoiseCommunityConnection, 'No API key required, but GreyNoise enforces a small anonymous lookup quota.'),
  }
);
