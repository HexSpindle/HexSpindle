import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import {
  parseAddressAuto, parseNetwork, netToStr, summarizeAddressRange, collapseAddressesInternal,
  overlaps, isSubnetOf, addressExclude, numAddresses, compareNetworks, bigComma,
} from './_ipaddr.js';

function parseMany(block) {
  const nets = [];
  for (let line of block.split('\n')) {
    line = line.trim();
    if (!line) continue;
    if (line.includes('-') && !line.includes('/')) {
      const dashIdx = line.indexOf('-');
      const a = line.slice(0, dashIdx).trim(), b = line.slice(dashIdx + 1).trim();
      const pa = parseAddressAuto(a), pb = parseAddressAuto(b);
      if (pa.version !== pb.version) throw new Error(`${a} and ${b} are not of the same version`);
      if (pa.val > pb.val) throw new Error('last IP address must be greater than first');
      nets.push(...summarizeAddressRange(pa.version, pa.val, pb.val));
    } else {
      nets.push(parseNetwork(line));
    }
  }
  return collapseAddressesInternal(nets);
}

module('CIDR Summarize / Merge', 'Merges a list of IPs, ranges and CIDRs into the smallest set of covering CIDR blocks.',
  [A.boolean('Exclude a second block (input: INCLUDE<sep>EXCLUDE, one per side)', false), A.string('Block separator', '---')],
  (t, exclude, sep) => {
    let merged;
    if (exclude && t.includes(sep)) {
      const idx = t.indexOf(sep);
      const incT = t.slice(0, idx), excT = t.slice(idx + sep.length);
      const inc = parseMany(incT), exc = parseMany(excT);
      let result = [];
      for (const n of inc) {
        let pieces = [n];
        for (const e of exc) {
          const next = [];
          for (const p of pieces) {
            if (overlaps(p, e)) {
              if (isSubnetOf(e, p)) next.push(...addressExclude(p, e));
              else if (!isSubnetOf(p, e)) next.push(p);
            } else next.push(p);
          }
          pieces = next;
        }
        result = result.concat(pieces);
      }
      merged = collapseAddressesInternal(result);
    } else {
      merged = parseMany(t);
    }
    let total = 0n;
    for (const n of merged) total += numAddresses(n);
    const sorted = [...merged].sort((a, b) => a.version !== b.version ? a.version - b.version : (a.net < b.net ? -1 : a.net > b.net ? 1 : 0));
    return sorted.map(netToStr).join('\n') + `\n\n${merged.length} block(s), ${bigComma(total)} addresses total`;
  }, { text: true });
