import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex, hexSep } from './_packet.js';

const ETHERTYPES = { 0x0800: 'IPv4', 0x0806: 'ARP', 0x86dd: 'IPv6', 0x8100: '802.1Q VLAN', 0x8847: 'MPLS unicast', 0x88cc: 'LLDP' };

module('Parse Ethernet frame', 'Decodes an Ethernet II frame header: destination/source MAC and EtherType.', [A.select('Input format', ['Raw', 'Hex'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    if (b.length < 14) throw new Error('Ethernet frame needs at least 14 bytes');
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const dst = hexSep(b.subarray(0, 6), ':'), src = hexSep(b.subarray(6, 12), ':');
    let etype = dv.getUint16(12);
    const out = [`Destination MAC: ${dst}`, `Source MAC: ${src}`];
    let off = 14;
    if (etype === 0x8100 && b.length >= 18) {
      const tag = dv.getUint16(14);
      out.push(`802.1Q VLAN ID: ${tag & 0xfff} (priority ${tag >> 13})`);
      etype = dv.getUint16(16);
      off = 18;
    }
    out.push(`EtherType: 0x${etype.toString(16).padStart(4, '0')} (${ETHERTYPES[etype] || 'unknown'})`);
    out.push(`Payload: ${hexSep(b.subarray(off))}`);
    return out.join('\n');
  });
