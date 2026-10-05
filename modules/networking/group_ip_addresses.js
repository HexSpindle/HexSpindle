import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';
import { parseAddressAuto, parseNetwork, netToStr, addrToStr, compareNetworks } from './_ipaddr.js';

module('Group IP addresses', 'Groups IPs (one per delimiter) by the network they belong to.',
  [A.select('Delimiter', DELIMS, 'Line feed'), A.number('Subnet (CIDR)', 24, 0, 128), A.boolean('Only show the subnets', false)],
  (t, d, prefix, only) => {
    prefix = Math.trunc(prefix);
    const groups = new Map();
    for (let tok of t.split(delim(d))) {
      tok = tok.trim();
      if (!tok) continue;
      const { version, val } = parseAddressAuto(tok);
      const net = parseNetwork(`${addrToStr(version, val)}/${prefix}`);
      const key = netToStr(net);
      if (!groups.has(key)) groups.set(key, { net, ips: [] });
      groups.get(key).ips.push(addrToStr(version, val));
    }
    const nets = [...groups.values()].sort((a, b) => compareNetworks(a.net, b.net));
    const out = [];
    for (const g of nets) {
      out.push(netToStr(g.net));
      if (!only) out.push(...g.ips.map(ip => '  ' + ip));
    }
    return out.join('\n');
  }, { text: true });
