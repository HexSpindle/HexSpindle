import { module } from './_cat.js';
import { A } from '../../core/registry.js';

let tablesPromise = null;
function getTables() {
  if (!tablesPromise) tablesPromise = import('./_oui_data.mjs').then(d => {
    const toMap = packed => { const m = new Map(); for (const line of packed.split('\n')) { if (!line) continue; const [hex, short, long] = line.split('\t'); m.set(hex, { short, long: long || short }); } return m; };
    return { mal: toMap(d.MAL), mam: toMap(d.MAM), mas: toMap(d.MAS), counts: d.counts };
  });
  return tablesPromise;
}

const hexOf = s => s.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();

module('MAC Vendor Lookup',
  'Looks up the manufacturer of a network interface from its MAC address or OUI prefix, using the public IEEE registry (MA-L, MA-M and MA-S blocks). '
  + 'Accepts full MAC addresses or just the first bytes, in any common format (colons, hyphens, dots or bare hex); it matches the longest registered prefix. '
  + 'It also flags locally administered and multicast/broadcast addresses, whose first bytes are not a real vendor assignment. One address per line.',
  [A.boolean('Show the full registrant name', true)],
  async (t, showLong) => {
    const { mal, mam, mas, counts } = await getTables();
    const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) throw new Error('No MAC address or OUI in the input');
    const lookup = hex => {
      if (hex.length >= 9 && mas.has(hex.slice(0, 9))) return { block: 'MA-S (36-bit)', ...mas.get(hex.slice(0, 9)) };
      if (hex.length >= 7 && mam.has(hex.slice(0, 7))) return { block: 'MA-M (28-bit)', ...mam.get(hex.slice(0, 7)) };
      if (hex.length >= 6 && mal.has(hex.slice(0, 6))) return { block: 'MA-L (24-bit)', ...mal.get(hex.slice(0, 6)) };
      return null;
    };
    const out = lines.map(line => {
      const hex = hexOf(line);
      if (hex.length < 6) return `${line}\n  not a MAC address or OUI (need at least 3 bytes / 6 hex digits)`;
      const oui = hex.slice(0, 6).replace(/(..)(..)(..)/, '$1:$2:$3');
      const first = parseInt(hex.slice(0, 2), 16);
      const flags = [];
      if (first & 0x01) flags.push('multicast/broadcast address (not a single interface)');
      if (first & 0x02) flags.push('locally administered (randomised or manually set — the OUI is not a real vendor assignment)');
      const hit = lookup(hex);
      const head = `${line}  [OUI ${oui}]`;
      if (!hit) return `${head}\n  vendor: not found in the IEEE registry${flags.length ? '\n  ' + flags.join('\n  ') : ''}`;
      const vendor = showLong && hit.long && hit.long !== hit.short ? `${hit.short} — ${hit.long}` : hit.short;
      return `${head}\n  vendor: ${vendor}\n  block:  ${hit.block}${flags.length ? '\n  ' + flags.join('\n  ') : ''}`;
    });
    return out.join('\n\n');
  }, { text: true, aliases: ['mac', 'oui', 'mac vendor', 'mac address', 'ethernet vendor', 'nic manufacturer'] });
