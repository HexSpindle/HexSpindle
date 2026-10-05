import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex, hexSep, ipv4Str } from './_packet.js';

const PROTOS = { 1: 'ICMP', 2: 'IGMP', 6: 'TCP', 17: 'UDP', 41: 'IPv6', 47: 'GRE', 50: 'ESP', 51: 'AH', 89: 'OSPF' };

module('Parse IPv4 header', 'Decodes the fields of an IPv4 header.', [A.select('Input format', ['Hex', 'Raw'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    if (b.length < 20) throw new Error('IPv4 header needs at least 20 bytes');
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const ihl = (b[0] & 15) * 4;
    const flags = b[6] >> 5;
    const chk = dv.getUint16(10);
    let s = 0;
    for (let i = 0; i < ihl - 1; i += 2) s += dv.getUint16(i);
    while (s >> 16) s = (s & 0xffff) + (s >> 16);
    return [
      `Version: ${b[0] >> 4}`, `Header length (IHL): ${ihl} bytes`, `DSCP: ${b[1] >> 2}  ECN: ${b[1] & 3}`,
      `Total length: ${dv.getUint16(2)}`, `Identification: 0x${dv.getUint16(4).toString(16).padStart(4, '0')}`,
      `Flags: ${flags.toString(2).padStart(3, '0')} (DF=${(flags >> 1) & 1}, MF=${flags & 1})`,
      `Fragment offset: ${(dv.getUint16(6) & 0x1fff) * 8}`, `TTL: ${b[8]}`, `Protocol: ${b[9]} (${PROTOS[b[9]] || 'unknown'})`,
      `Header checksum: 0x${chk.toString(16).padStart(4, '0')} (${s === 0xffff ? 'valid' : 'INVALID'})`,
      `Source IP: ${ipv4Str(b, 12)}`, `Destination IP: ${ipv4Str(b, 16)}`,
      `Options: ${hexSep(b.subarray(20, ihl)) || 'none'}`,
    ].join('\n');
  });
