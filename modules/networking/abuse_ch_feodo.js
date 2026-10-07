import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, extractIps, fetchJson, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'abuse_ch_feodo';
const DATASETS = {
  'Recommended active': 'https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json',
  'Recent / last 30 days': 'https://feodotracker.abuse.ch/downloads/ipblocklist.json',
};

async function loadDataset(name) {
  const url = DATASETS[name] || DATASETS['Recommended active'];
  const { data } = await fetchJson(url, { headers: { Accept: 'application/json' } }, 30000);
  if (!Array.isArray(data)) throw new Error('Feodo Tracker returned an unexpected response');
  return data;
}

export async function testAbuseChConnection() {
  try {
    await loadDataset('Recommended active');
    return { ok: true, message: 'Connected to abuse.ch Feodo Tracker.' };
  } catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'abuse.ch Feodo Tracker',
  'Check IPv4 indicators against abuse.ch Feodo Tracker botnet C2 datasets. The recommended list focuses on recently active C2 servers; the recent dataset includes additional C2s seen within roughly the last 30 days. No API key is required.',
  [A.select('Dataset', Object.keys(DATASETS), 'Recommended active'), A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, dataset, output) => {
    const ips = extractIps(input);
    const records = await loadDataset(dataset);
    const byIp = new Map();
    for (const item of records) {
      const ip = item?.ip_address;
      if (!ip) continue;
      if (!byIp.has(ip)) byIp.set(ip, []);
      byIp.get(ip).push(pruneEmpty({
        port: item.port,
        status: item.status,
        hostname: item.hostname,
        as_number: item.as_number,
        as_name: item.as_name,
        country: item.country,
        first_seen: item.first_seen,
        last_online: item.last_online,
        malware: item.malware,
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
    connection: publicConnection(SERVICE, testAbuseChConnection, 'No API key required. Test downloads the small recommended Feodo Tracker JSON blocklist.'),
  }
);
