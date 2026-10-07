import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, isIpv4, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'shodan_internetdb';
const API = 'https://internetdb.shodan.io';

async function query(ip) {
  if (!isIpv4(ip)) return { supported: false, message: 'Shodan InternetDB supports IPv4 lookups.' };
  const { response, data } = await fetchJson(`${API}/${encodeURIComponent(ip)}`, { headers: { Accept: 'application/json' } }, 20000, [404]);
  if (response.status === 404) return { found: false };
  return data || {};
}

function parse(data) {
  if (data?.found === false || data?.supported === false) return data;
  return pruneEmpty({ found: true, hostnames: data?.hostnames, ports: data?.ports, cpes: data?.cpes, tags: data?.tags, vulns: data?.vulns });
}

export async function testShodanInternetDBConnection() {
  try { await query('8.8.8.8'); return { ok: true, message: 'Connected to Shodan InternetDB.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'Shodan InternetDB',
  'Query Shodan InternetDB for fast, keyless IPv4 enrichment: observed open ports, hostnames, CPEs, tags and known vulnerabilities. InternetDB is separate from the main Shodan API and does not require an API key; Shodan documents it as free for non-commercial use.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await mapIps(input, async ip => parse(await query(ip))), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['InternetDB', 'Shodan free', 'Shodan'],
    connection: publicConnection(SERVICE, testShodanInternetDBConnection, 'No Shodan API key required.'),
  }
);
