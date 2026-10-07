import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';
import { cymruOriginName, dnsAnswers, doh, unquoteTxt } from './_dns_enrichment.js';

const SERVICE = 'team_cymru';

function fields(txt) { return unquoteTxt(txt).split('|').map(x => x.trim()); }

async function query(ip) {
  const originDns = await doh(cymruOriginName(ip), 'TXT');
  const originRows = dnsAnswers(originDns, 16).map(fields).map(parts => pruneEmpty({
    asn: Number(parts[0]), prefix: parts[1], country: parts[2], registry: parts[3], allocated: parts[4],
  })).filter(Boolean);
  const asns = [...new Set(originRows.map(x => x?.asn).filter(Number.isFinite))];
  const descriptions = [];
  for (const asn of asns.slice(0, 4)) {
    const data = await doh(`AS${asn}.asn.cymru.com`, 'TXT');
    for (const answer of dnsAnswers(data, 16)) {
      const p = fields(answer);
      descriptions.push(pruneEmpty({ asn: Number(p[0]), country: p[1], registry: p[2], allocated: p[3], description: p.slice(4).join(' | ') }));
    }
  }
  const primary = originRows[0], desc = descriptions.find(x => x?.asn === primary?.asn) || descriptions[0];
  return pruneEmpty({
    asn: primary?.asn,
    prefix: primary?.prefix,
    country: primary?.country,
    registry: primary?.registry,
    allocated: primary?.allocated,
    as_description: desc?.description,
    origins: originRows,
    as_details: descriptions,
  });
}

export async function testTeamCymruConnection() {
  try { await query('8.8.8.8'); return { ok: true, message: 'Connected to Team Cymru IP-to-ASN through Google DNS-over-HTTPS.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'Team Cymru IP to ASN',
  'Resolve IPv4/IPv6 addresses to BGP origin ASN, announced prefix, registry, allocation date and AS description using Team Cymru DNS zones through Google Public DNS-over-HTTPS. No API key required.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await mapIps(input, query), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['Cymru', 'IP to ASN', 'origin.asn.cymru.com'],
    connection: publicConnection(SERVICE, testTeamCymruConnection, 'No credential required. DNS queries use Google Public DNS DoH.'),
  }
);
