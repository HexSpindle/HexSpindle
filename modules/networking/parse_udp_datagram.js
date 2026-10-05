import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex, hexSep } from './_packet.js';

module('Parse UDP datagram', 'Decodes a UDP header and shows the payload.', [A.select('Input format', ['Hex', 'Raw'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    if (b.length < 8) throw new Error('UDP header needs 8 bytes');
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return [
      `Source port: ${dv.getUint16(0)}`, `Destination port: ${dv.getUint16(2)}`,
      `Length: ${dv.getUint16(4)}`, `Checksum: 0x${dv.getUint16(6).toString(16).padStart(4, '0')}`, `Data: ${hexSep(b.subarray(8))}`,
    ].join('\n');
  });
