import { module } from './_cat.js';
import { parseIPv6, ipv6Exploded, ipv6Compressed, classifyV6, ipv4Mapped, sixtofour, teredo, ipv4ToStr } from './_ipaddr.js';

module('Parse IPv6 address', 'Shows the expanded, compressed and classification info for an IPv6 address.', [],
  (t) => {
    const { val } = parseIPv6(t.trim());
    const kind = classifyV6(val);
    const out = [`Longhand: ${ipv6Exploded(val)}`, `Shorthand: ${ipv6Compressed(val)}`,
      `Classification: ${kind.length ? kind.map(k => k.slice(3)).join(', ') : 'unknown'}`];
    const mapped = ipv4Mapped(val);
    if (mapped !== null) out.push(`IPv4-mapped: ${ipv4ToStr(mapped)}`);
    const s4 = sixtofour(val);
    if (s4 !== null) out.push(`6to4 gateway: ${ipv4ToStr(s4)}`);
    const td = teredo(val);
    if (td !== null) out.push(`Teredo server/client: ${ipv4ToStr(td[0])} / ${ipv4ToStr(td[1])}`);
    return out.join('\n');
  }, { text: true });
