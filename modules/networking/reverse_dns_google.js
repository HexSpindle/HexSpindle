import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, extractIps, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';
import { dnsAnswers, dnsMeta, doh, reverseDnsName, stripDnsDot } from './_dns_enrichment.js';

const SERVICE = 'reverse_dns_google';

async function query(ip) {
  const data = await doh(reverseDnsName(ip), 'PTR');
  const ptr = [...new Set(dnsAnswers(data, 12).map(stripDnsDot))];
  return pruneEmpty({ ptr, ...dnsMeta(data) });
}

export async function testReverseDNSConnection() {
  try { await query('8.8.8.8'); return { ok: true, message: 'Connected to Google Public DNS-over-HTTPS.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

// Conservative per-run ceiling protects free endpoints against unintentional flooding.
const DEFAULT_LIMIT = 100;
async function constrainedMap(input, queryFn) {
  const count = extractIps(input).length;
  if (count > DEFAULT_LIMIT) throw new Error(`This provider is limited by HexSpindle to ${DEFAULT_LIMIT} IPs per run (requested ${count}). Use a cached/local data source or split your list.`);
  return mapIps(input, queryFn, { delayMs: 150 });
}

module(
  'Reverse DNS Lookup',
  'Perform IPv4/IPv6 PTR lookups through Google Public DNS-over-HTTPS. Returns reverse-DNS names plus DNSSEC validation/status metadata. Browser-safe and no API key required. Reverse DNS PTR is live DNS (no reliable complete periodic downloadable database); records and TTL change. Default maximum 100 IPs/run, 150 ms spacing. No PTR response does not imply inactivity.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await constrainedMap(input, query), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['PTR', 'rDNS', 'Reverse DNS', 'Google DoH'],
    connection: publicConnection(SERVICE, testReverseDNSConnection, 'No credential required. Uses Google Public DNS JSON DoH API.'),
  }
);
