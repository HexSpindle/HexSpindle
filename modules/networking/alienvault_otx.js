import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'alienvault_otx';
const API = 'https://otx.alienvault.com/api/v1/indicators';

async function query(ip) {
  const kind = ip.includes(':') ? 'IPv6' : 'IPv4';
  const { data } = await fetchJson(`${API}/${kind}/${encodeURIComponent(ip)}/general`, { headers: { Accept: 'application/json' } });
  return data || {};
}

function parse(data) {
  const pulseInfo = data?.pulse_info || {};
  const pulses = Array.isArray(pulseInfo.pulses) ? pulseInfo.pulses : [];
  const tags = [...new Set(pulses.flatMap(p => Array.isArray(p?.tags) ? p.tags : []).filter(Boolean))].slice(0, 40);
  const pulseNames = pulses.map(p => p?.name).filter(Boolean).slice(0, 20);
  return pruneEmpty({
    reputation: data?.reputation,
    pulse_count: pulseInfo?.count,
    pulse_names: pulseNames,
    tags,
    asn: data?.asn,
    country_code: data?.country_code,
    country_name: data?.country_name,
    sections: data?.sections,
    whois: data?.whois,
  });
}

export async function testAlienVaultOTXConnection() {
  try { await query('8.8.8.8'); return { ok: true, message: 'Connected to AlienVault OTX (anonymous indicator lookup).' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'AlienVault OTX IP',
  'Query AlienVault Open Threat Exchange general indicator intelligence for IPv4/IPv6 addresses, including reputation, pulse count/names, tags, ASN, country and available data sections. General indicator lookups currently work without an API key; anonymous limits may apply.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await mapIps(input, async ip => parse(await query(ip))), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['OTX', 'Open Threat Exchange', 'AlienVault'],
    connection: publicConnection(SERVICE, testAlienVaultOTXConnection, 'No key is sent. Test performs one anonymous general lookup.'),
  }
);
