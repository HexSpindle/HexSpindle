import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, extractIps, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';
import { cymruOriginName, dnsAnswers, doh, unquoteTxt } from './_dns_enrichment.js';

const SERVICE = 'team_cymru';

function fields(txt) { return unquoteTxt(txt).split('|').map(x => x.trim()); }

const asnCache=new Map();
async function asnDetails(asn) {
  if(asnCache.has(asn))return asnCache.get(asn);
  const promised=doh(`AS${asn}.asn.cymru.com`,'TXT').catch(e=>{asnCache.delete(asn);throw e;});
  if(asnCache.size>5000)asnCache.clear();
  asnCache.set(asn,promised);
  return promised;
}
async function query(ip) {
  const originDns = await doh(cymruOriginName(ip), 'TXT');
  const originRows = dnsAnswers(originDns, 16).map(fields).map(parts => pruneEmpty({
    asn: Number(parts[0]), prefix: parts[1], country: parts[2], registry: parts[3], allocated: parts[4],
  })).filter(Boolean);
  const asns = [...new Set(originRows.map(x => x?.asn).filter(Number.isFinite))];
  const descriptions = [];
  for (const asn of asns.slice(0, 4)) {
    const data = await asnDetails(asn);
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

async function batchCymru(input){
 const count=extractIps(input).length;
 if(count>100)throw new Error('Team Cymru DNS mode is limited to 100 IPs/run. Bulk Whois TCP 43 requires a server-side service; it is not a downloadable full IP→origin DB.');
 return mapIps(input,query,{delayMs:150});
}
module(
  'Team Cymru IP to ASN',
  'Resolve IPv4/IPv6 addresses to BGP origin ASN, announced prefix, registry, allocation date and AS description using Team Cymru DNS zones through Google Public DNS-over-HTTPS. No API key required. Default: 100 IPs/run with 150 ms spacing; AS descriptions are shared across repeated ASNs. This is observed BGP origin data, not ownership. Team Cymru official bulk Whois requires TCP, unavailable to normal browser JavaScript.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => enrichmentResult(SERVICE, await batchCymru(input), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['Cymru', 'IP to ASN', 'origin.asn.cymru.com'],
    connection: publicConnection(SERVICE, testTeamCymruConnection, 'No credential required. DNS queries use Google Public DNS DoH.'),
  }
);
