import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, isIpv4, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'threatminer';
const API = 'https://api.threatminer.org/v2/host.php';
const LOOKUPS = {
  'WHOIS': 1,
  'Passive DNS': 2,
  'URIs': 3,
  'Related samples': 4,
  'SSL certificate hashes': 5,
  'Report tags': 6,
};

async function query(ip, rt) {
  if (!isIpv4(ip)) return { supported: false, message: 'ThreatMiner host lookups support IPv4 indicators.' };
  const { data } = await fetchJson(`${API}?q=${encodeURIComponent(ip)}&rt=${rt}`, { headers: { Accept: 'application/json' } }, 30000);
  return data || {};
}

function parse(data, lookup) {
  if (data?.supported === false) return data;
  const results = Array.isArray(data?.results) ? data.results : data?.results == null ? undefined : data.results;
  return pruneEmpty({
    lookup,
    found: Number(data?.status_code) === 200,
    status_code: data?.status_code,
    status_message: data?.status_message,
    result_count: Array.isArray(results) ? results.length : (results == null ? undefined : 1),
    results,
  });
}

export async function testThreatMinerConnection() {
  try { await query('8.8.8.8', 2); return { ok: true, message: 'Connected to ThreatMiner.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'ThreatMiner IP',
  'Query ThreatMiner IPv4 intelligence without an API key. Choose WHOIS, passive DNS, URIs, related samples, SSL certificate hashes or report tags. ThreatMiner documents a 10-query-per-minute limit, so requests are throttled by default.',
  [
    A.select('Lookup', Object.keys(LOOKUPS), 'Passive DNS'),
    A.number('Delay between requests (ms)', 6100, 0, 30000, 100),
    A.select('Output', OUTPUT_FORMATS, 'JSON'),
  ],
  async (input, lookup, delayMs, output) => {
    const rt = LOOKUPS[lookup] || 2;
    const rows = await mapIps(input, async ip => parse(await query(ip, rt), lookup), { delayMs: Math.max(0, Number(delayMs) || 0) });
    return enrichmentResult(SERVICE, rows, output);
  },
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['ThreatMiner', 'Passive DNS'],
    connection: publicConnection(SERVICE, testThreatMinerConnection, 'No API key required. ThreatMiner documents a 10 queries/minute rate limit.'),
  }
);
