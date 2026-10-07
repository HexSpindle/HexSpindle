import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'ripestat';
const BASE = 'https://stat.ripe.net/data';

async function endpoint(name, ip, extra = '') {
  const url = `${BASE}/${name}/data.json?resource=${encodeURIComponent(ip)}${extra}`;
  const { data } = await fetchJson(url, { headers: { Accept: 'application/json' } }, 25000);
  if (data?.status && data.status !== 'ok') throw new Error(data?.messages?.[0]?.[1] || `RIPEstat ${name} failed`);
  return data?.data || {};
}

function recordToObject(record) {
  const out = {};
  for (const item of Array.isArray(record) ? record : []) {
    const key = item?.key;
    const value = item?.value;
    if (!key || value == null || value === '') continue;
    if (out[key] === undefined) out[key] = value;
    else if (Array.isArray(out[key])) out[key].push(value);
    else out[key] = [out[key], value];
  }
  return pruneEmpty(out);
}

function compactWhois(data, maxRecords) {
  const records = (data?.records || []).slice(0, maxRecords).map(recordToObject).filter(Boolean);
  const irr = (data?.irr_records || []).slice(0, maxRecords).map(recordToObject).filter(Boolean);
  return pruneEmpty({ authorities: data?.authorities, records, irr_records: irr });
}

function compactRouting(data) {
  return pruneEmpty({
    first_seen: data?.first_seen,
    last_seen: data?.last_seen,
    visibility: data?.visibility,
    origins: data?.origins,
    less_specifics: data?.less_specifics,
    more_specifics: data?.more_specifics,
    query_time: data?.query_time,
  });
}

async function query(ip, includeWhois, includeRouting, maxRecords) {
  const jobs = [
    endpoint('network-info', ip),
    endpoint('abuse-contact-finder', ip),
    endpoint('rir', ip, '&lod=2'),
  ];
  if (includeWhois) jobs.push(endpoint('whois', ip));
  if (includeRouting) jobs.push(endpoint('routing-status', ip));
  const results = await Promise.allSettled(jobs);
  const take = index => results[index]?.status === 'fulfilled' ? results[index].value : undefined;
  const net = take(0), abuse = take(1), rir = take(2);
  let pos = 3;
  const whois = includeWhois ? take(pos++) : undefined;
  const routing = includeRouting ? take(pos++) : undefined;
  const errors = results.map((r, i) => r.status === 'rejected' ? `${i}:${r.reason?.message || r.reason}` : null).filter(Boolean);
  return pruneEmpty({
    prefix: net?.prefix,
    asns: net?.asns,
    abuse_contacts: abuse?.abuse_contacts,
    authoritative_rir: abuse?.authoritative_rir,
    rir: rir,
    whois: includeWhois ? compactWhois(whois, maxRecords) : undefined,
    routing: includeRouting ? compactRouting(routing) : undefined,
    partial_errors: errors,
  });
}

export async function testRIPEstatConnection() {
  try { await endpoint('network-info', '8.8.8.8'); return { ok: true, message: 'Connected to RIPEstat Data API.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'RIPEstat IP Intelligence',
  'Browser-safe RIPE NCC enrichment for IPv4/IPv6: containing BGP prefix/origin ASN, authoritative RIR, abuse contacts, optional WHOIS/IRR records, and optional routing visibility/status from RIPE RIS. No API key required.',
  [
    A.boolean('Include WHOIS / IRR records', true),
    A.boolean('Include routing details', true),
    A.number('Max WHOIS / IRR records', 5, 1, 25, 1),
    A.select('Output', OUTPUT_FORMATS, 'JSON'),
  ],
  async (input, includeWhois, includeRouting, maxRecords, output) => enrichmentResult(
    SERVICE,
    await mapIps(input, ip => query(ip, includeWhois, includeRouting, Math.max(1, Math.min(25, maxRecords | 0)))),
    output,
  ),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['RIPEstat', 'RIPE RIS', 'BGP status', 'Abuse contact finder'],
    connection: publicConnection(SERVICE, testRIPEstatConnection, 'No credential required. Uses RIPEstat browser-facing Data API.'),
  }
);
