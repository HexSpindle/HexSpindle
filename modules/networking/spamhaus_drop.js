import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, extractIps, fetchJson, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';
import { compileCidrs, findCidrMatches } from './_cidr_match.js';

const SERVICE = 'spamhaus_drop';
const V4 = new URL('../../data/ip-intel/spamhaus_drop_v4.json', import.meta.url);
const V6 = new URL('../../data/ip-intel/spamhaus_drop_v6.json', import.meta.url);

async function load(url) {
  const { data } = await fetchJson(url.href, { headers: { Accept: 'application/json' } }, 15000);
  const records = Array.isArray(data) ? data : data?.records;
  if (!Array.isArray(records)) throw new Error('Spamhaus cache is missing or malformed. Run the IP enrichment feed updater workflow.');
  return { records, metadata: data?.metadata };
}

async function datasets(ips) {
  const need4 = ips.some(ip => !ip.includes(':'));
  const need6 = ips.some(ip => ip.includes(':'));
  const [v4, v6] = await Promise.all([
    need4 ? load(V4) : Promise.resolve(null),
    need6 ? load(V6) : Promise.resolve(null),
  ]);
  return { v4, v6 };
}

export async function testSpamhausDropConnection() {
  try {
    await load(V4);
    return { ok: true, message: 'Spamhaus DROP same-origin cache is available.' };
  } catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'Spamhaus DROP',
  'Check IPv4/IPv6 indicators against a same-origin cache of Spamhaus DROP/DROPv6 high-confidence malicious or hijacked netblocks. The bundled updater fetches the official JSON datasets at most once per hour; browser lookups never contact Spamhaus directly.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => {
    const ips = extractIps(input);
    const { v4, v6 } = await datasets(ips);
    const c4 = compileCidrs(v4?.records || []), c6 = compileCidrs(v6?.records || []);
    const rows = ips.map(ip => {
      const matches = findCidrMatches(ip.includes(':') ? c6 : c4, ip).map(r => pruneEmpty({ cidr: r.cidr, sblid: r.sblid, rir: r.rir, cc: r.cc })).filter(Boolean);
      return pruneEmpty({ ip, listed: matches.length > 0, match_count: matches.length, matches });
    });
    return enrichmentResult(SERVICE, rows, output);
  },
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['Spamhaus', 'DROP', 'DROPv6', 'hijacked netblock'],
    connection: publicConnection(SERVICE, testSpamhausDropConnection, 'Uses data/ip-intel same-origin cache. Run the included updater workflow after installing.'),
  }
);
