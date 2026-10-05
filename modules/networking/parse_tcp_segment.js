import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex, hexSep } from './_packet.js';

module('Parse TCP segment', 'Decodes a TCP header and shows flags and payload.', [A.select('Input format', ['Hex', 'Raw'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    if (b.length < 20) throw new Error('TCP header needs at least 20 bytes');
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const off = (b[12] >> 4) * 4;
    const fl = b[13] | ((b[12] & 1) << 8);
    const names = ['FIN', 'SYN', 'RST', 'PSH', 'ACK', 'URG', 'ECE', 'CWR', 'NS'];
    const flagNames = names.filter((n, i) => (fl >> i) & 1).join(', ') || 'none';
    return [
      `Source port: ${dv.getUint16(0)}`, `Destination port: ${dv.getUint16(2)}`,
      `Sequence number: ${dv.getUint32(4)}`, `Acknowledgement number: ${dv.getUint32(8)}`,
      `Data offset: ${off} bytes`, `Flags: ${flagNames} (0x${fl.toString(16).padStart(3, '0')})`,
      `Window: ${dv.getUint16(14)}`, `Checksum: 0x${dv.getUint16(16).toString(16).padStart(4, '0')}`,
      `Urgent pointer: ${dv.getUint16(18)}`, `Options: ${hexSep(b.subarray(20, off)) || 'none'}`, `Data: ${hexSep(b.subarray(off))}`,
    ].join('\n');
  });
