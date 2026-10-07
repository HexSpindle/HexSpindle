import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'urlscan_io';
const API = 'https://urlscan.io/api/v1/search/';

async function query(ip, size) {
  const q = `ip:${ip}`;
  const { data } = await fetchJson(`${API}?q=${encodeURIComponent(q)}&size=${size}`, { headers: { Accept: 'application/json' } }, 30000);
  return data || {};
}

function parse(data, maxResults) {
  const results = Array.isArray(data?.results) ? data.results.slice(0, maxResults) : [];
  const scans = results.map(r => pruneEmpty({
    id: r?._id,
    date: r?.task?.time,
    task_url: r?.task?.url,
    page_url: r?.page?.url,
    domain: r?.page?.domain,
    ip: r?.page?.ip,
    country: r?.page?.country,
    asn: r?.page?.asn,
    as_name: r?.page?.asnname,
    result: r?.result,
    screenshot: r?.screenshot,
  })).filter(Boolean);
  return pruneEmpty({ total: data?.total, returned: scans.length, has_more: data?.has_more, scans });
}

export async function testURLScanConnection() {
  try { await query('8.8.8.8', 1); return { ok: true, message: 'Connected to urlscan.io Search API (anonymous quota).' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'URLScan.io IP Search',
  'Search public urlscan.io scan history for IPv4/IPv6 indicators. Returns a compact list of recent scans, URLs/domains, country and ASN context. Unauthenticated requests receive only urlscan.io\'s minor anonymous quota.',
  [A.number('Max results per IP', 5, 1, 50, 1), A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, maxResults, output) => {
    const size = Math.max(1, Math.min(50, maxResults | 0));
    return enrichmentResult(SERVICE, await mapIps(input, async ip => parse(await query(ip, size), size)), output);
  },
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['urlscan', 'URLScan.io', 'scan history'],
    connection: publicConnection(SERVICE, testURLScanConnection, 'No API key is sent; anonymous Search API quotas are much smaller than authenticated quotas.'),
  }
);
