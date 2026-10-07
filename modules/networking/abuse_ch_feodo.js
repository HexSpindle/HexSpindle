import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, extractIps, fetchJson, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'abuse_ch_feodo';
const CACHE = new URL('../../data/ip-intel/feodo_recommended.json', import.meta.url);

async function loadDataset() {
  const { data } = await fetchJson(CACHE.href, { headers: { Accept: 'application/json' } }, 15000);
  const records = Array.isArray(data) ? data : data?.records;
  if (!Array.isArray(records)) throw new Error('Feodo cache is missing or malformed. Run the IP enrichment feed updater workflow.');
  return records;
}

export async function testAbuseChConnection() {
  try { await loadDataset(); return { ok: true, message: 'abuse.ch Feodo same-origin cache is available.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'abuse.ch Feodo Tracker',
  'Check IPv4 indicators against a same-origin cache of the official abuse.ch Feodo Tracker recommended botnet C2 blocklist. No API key and no cross-origin browser request are required; the included updater refreshes the cache from abuse.ch.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => {
    const ips = extractIps(input);
    const records = await loadDataset();
    const byIp = new Map();
    for (const item of records) {
      const ip = item?.ip_address;
      if (!ip) continue;
      if (!byIp.has(ip)) byIp.set(ip, []);
      byIp.get(ip).push(pruneEmpty({
        port: item?.port,
        status: item?.status,
        hostname: item?.hostname,
        as_number: item?.as_number,
        as_name: item?.as_name,
        country: item?.country,
        first_seen: item?.first_seen,
        last_online: item?.last_online,
        malware: item?.malware,
      }));
    }
    const rows = ips.map(ip => {
      const matches = (byIp.get(ip) || []).filter(Boolean);
      return pruneEmpty({ ip, listed: matches.length > 0, match_count: matches.length, matches });
    });
    return enrichmentResult(SERVICE, rows, output);
  },
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['abuse.ch', 'Feodo', 'Feodo Tracker', 'botnet C2'],
    connection: publicConnection(SERVICE, testAbuseChConnection, 'Uses data/ip-intel same-origin cache. Run the included updater workflow after installing.'),
  }
);
