import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex } from './_packet.js';

module('Strip IPv4 header', 'Removes the IPv4 header (IHL * 4 bytes) leaving the payload.', [A.select('Input format', ['Raw', 'Hex'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    return b.subarray((b[0] & 15) * 4);
  });
