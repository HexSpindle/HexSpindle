import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex, hexSep } from './_packet.js';

module('Parse Ethernet frame', 'Decodes an Ethernet II frame header: source/destination MAC and VLAN tags, or returns the payload.',
  [A.select('Input format', ['Raw', 'Hex']), A.select('Return type', ['Text output', 'Packet data', 'Packet data (hex)'])],
  (data, fmt, ret = 'Text output') => {
    const b = rawOrHex(data, fmt);
    const dst = b.subarray(0, 6), src = b.subarray(6, 12);
    let off = 12;
    const vlans = [];
    while (off < b.length) {
      const t0 = b[off], t1 = b[off + 1];
      off += 2;
      if ((t0 === 0x81 && t1 === 0x00) || (t0 === 0x88 && t1 === 0xa8)) {
        vlans.push(((b[off] & 0x0f) << 8) | (b[off + 1] ?? 0));
        off += 2;
      } else break;
    }
    const payload = b.subarray(Math.min(off, b.length));
    if (ret === 'Packet data') return payload;
    if (ret === 'Packet data (hex)') return hexSep(payload, ' ');
    let out = `Source MAC: ${hexSep(src, ':')}\nDestination MAC: ${hexSep(dst, ':')}\n`;
    if (vlans.length) out += `VLAN: ${vlans.join(', ')}\n`;
    return out + `Data:\n${hexSep(payload, ' ')}`;
  });
