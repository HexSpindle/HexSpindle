import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('DNS over HTTPS', 'Resolves the name in the input using a public DNS-over-HTTPS resolver.',
  [A.select('Resolver', ['https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve']),
    A.select('Request type', ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'PTR', 'SRV', 'CAA']), A.boolean('Answer data only', true)],
  async (t, resolver, rtype, only) => {
    const q = new URLSearchParams({ name: t.trim(), type: rtype });
    const res = await fetch(`${resolver}?${q}`, { headers: { Accept: 'application/dns-json' } });
    const d = await res.json();
    if (only) return (d.Answer || []).map(a => a.data || '').join('\n') || '(no answers)';
    return JSON.stringify(d, null, 2);
  }, { text: true, net: true });
