import { module } from './_cat.js';
import { parseIPv4, ipv4ToStr, ipv6Compressed } from './_ipaddr.js';

module('IPv6 Transition Addresses', 'Converts an IPv4 address to its IPv4-mapped, 6to4 and NAT64 IPv6 forms.', [],
  (t) => {
    const out = [];
    for (const tok of t.split(/\s+/).filter(Boolean)) {
      const n = parseIPv4(tok);
      const ip = ipv4ToStr(n);
      const hi = (n >> 16n) & 0xffffn, lo = n & 0xffffn;
      const nat64 = (0x64ff9bn << 96n) | n;
      out.push(`IPv4: ${ip}`, `  IPv4-mapped: ::ffff:${ip}`,
        `  6to4: 2002:${hi.toString(16).padStart(4, '0')}:${lo.toString(16).padStart(4, '0')}::`,
        `  NAT64 (64:ff9b::/96): ${ipv6Compressed(nat64)}`);
    }
    return out.join('\n');
  }, { text: true });
