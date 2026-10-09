import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, isIpv4, extractIps, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

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

// Conservative per-run ceiling protects free endpoints against unintentional flooding.
const DEFAULT_LIMIT = 50;
async function constrainedMap(input, queryFn) {
  const count = extractIps(input).length;
  if (count > DEFAULT_LIMIT) throw new Error(`This provider is limited by HexSpindle to ${DEFAULT_LIMIT} IPs per run (requested ${count}). Use a cached/local data source or split your list.`);
  return mapIps(input, queryFn, { delayMs: 300 });
}

module(
  'Shodan InternetDB',
  'Query Shodan InternetDB for fast, keyless IPv4 enrichment: observed open ports, hostnames, CPEs, tags and known vulnerabilities. InternetDB is separate from the main Shodan API and does not require an API key; Shodan documents it as free for non-commercial use. Shodan InternetDB is IPv4-only and free for non-commercial use; bulk databases require separate Shodan access. Default maximum 50 IPs/run, 300 ms spacing. Absence of a record does not prove the host is safe.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await constrainedMap(input, async ip => parse(await query(ip))), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['InternetDB', 'Shodan free', 'Shodan'],
    connection: publicConnection(SERVICE, testShodanInternetDBConnection, 'No Shodan API key required.'),
  }
);
