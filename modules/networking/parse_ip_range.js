import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import {
  parseAddressAuto, parseNetwork, netToStr, addrToStr, summarizeAddressRange,
  netmaskOf, hostmaskOf, broadcastOf, numAddresses,
} from './_ipaddr.js';

module('Parse IP range', 'Describes a CIDR block or a-b range and optionally lists every address.',
  [A.boolean('Include network info', true), A.boolean('List all addresses', false), A.boolean('Allow large (>65536) listings', false)],
  (t, info, listall, large) => {
    const out = [];
    for (let line of t.split('\n')) {
      line = line.trim();
      if (!line) continue;
      const m = /^(\S+?)\s*-\s*(\S+)$/.exec(line);
      if (m) {
        const a = parseAddressAuto(m[1]), b = parseAddressAuto(m[2]);
        if (a.version !== b.version) throw new Error(`${m[1]} and ${m[2]} are not of the same version`);
        if (a.val > b.val) throw new Error('last IP address must be greater than first');
        const nets = summarizeAddressRange(a.version, a.val, b.val);
        const count = b.val - a.val + 1n;
        out.push(`Range ${addrToStr(a.version, a.val)} - ${addrToStr(b.version, b.val)}: ${count} addresses; CIDR: ${nets.map(netToStr).join(', ')}`);
        if (listall && (count < 65536n || large)) {
          for (let i = a.val; i <= b.val; i++) out.push(addrToStr(a.version, i));
        }
        continue;
      }
      const n = parseNetwork(line);
      if (info) {
        out.push(`Network: ${addrToStr(n.version, n.net)}/${n.prefixlen}`, `Netmask: ${addrToStr(n.version, netmaskOf(n))}`,
          `Hostmask: ${addrToStr(n.version, hostmaskOf(n))}`, `Broadcast: ${addrToStr(n.version, broadcastOf(n))}`,
          `Addresses: ${numAddresses(n)}`);
        if (n.version === 4 && numAddresses(n) > 2n) out.push(`Usable range: ${addrToStr(4, n.net + 1n)} - ${addrToStr(4, broadcastOf(n) - 1n)}`);
      }
      if (listall && (numAddresses(n) <= 65536n || large)) {
        for (let i = n.net; i <= broadcastOf(n); i++) out.push(addrToStr(n.version, i));
      }
    }
    return out.join('\n');
  }, { text: true });
