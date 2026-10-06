import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const REQUEST_TYPES = ['A', 'AAAA', 'ANAME', 'CERT', 'CNAME', 'DNSKEY', 'HTTPS', 'IPSECKEY', 'LOC', 'MX', 'NS',
  'OPENPGPKEY', 'PTR', 'RRSIG', 'SIG', 'SOA', 'SPF', 'SRV', 'SSHFP', 'TA', 'TXT', 'URI', 'ANY'];

module('DNS over HTTPS', 'Resolves the name in the input using a public DNS-over-HTTPS resolver. Works with any service that accepts the "name" and "type" GET parameters.',
  [A.select('Resolver', ['https://dns.google.com/resolve', 'https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve']),
    A.select('Request type', REQUEST_TYPES), A.boolean('Answer data only', false),
    A.boolean('Disable DNSSEC validation', false)],
  async (t, resolver, rtype, only, noDnssec) => {
    const url = new URL(resolver);
    url.search = new URLSearchParams({ name: t, type: rtype, cd: noDnssec });
    const res = await fetch(url, { headers: { Accept: 'application/dns-json' } });
    const d = await res.json();
    if (only) return JSON.stringify((d.Answer || []).map(a => a.data), null, 4);
    return JSON.stringify(d, null, 4);
  }, { text: true, net: true });
