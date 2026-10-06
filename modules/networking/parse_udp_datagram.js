import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex, hexSep } from './_packet.js';

module('Parse UDP datagram', 'Decodes a UDP header and shows the payload, as JSON.', [A.select('Input format', ['Hex', 'Raw'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    if (b.length < 8) throw new Error('Need 8 bytes for a UDP Header');
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const out = {
      'Source port': dv.getUint16(0),
      'Destination port': dv.getUint16(2),
      Length: dv.getUint16(4),
      Checksum: '0x' + hexSep(b.subarray(6, 8)),
    };
    // The length field counts the 8-byte header, and a truncated datagram simply
    // yields fewer payload bytes than it claims.
    if (b.length > 8) out.Data = '0x' + hexSep(b.subarray(8, 8 + Math.max(0, out.Length - 8)));
    return JSON.stringify(out, null, 4);
  });
