import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { concatBytes } from '../../core/util.js';

module('Embed LSB', "Hides bytes in the least significant bit(s) of carrier data (pairs with Extract LSB). Input is the carrier; the payload is a separate argument.",
  [A.toggle('Payload', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8'), A.number('Bits per byte (1-4)', 1, 1, 4), A.select('Bit order', ['MSB first', 'LSB first']), A.number('Skip bytes', 0, 0), A.boolean("Prefix payload with its length (so Extract LSB isn't needed to know where it ends)", true)],
  (data, payload, n, order, skip, prefixLen) => {
    if (prefixLen) {
      const lenBytes = new Uint8Array(4);
      new DataView(lenBytes.buffer).setUint32(0, payload.length, false);
      payload = concatBytes([lenBytes, payload]);
    }
    const capacity = Math.floor((data.length - skip) * n / 8);
    if (payload.length > capacity) throw new Error(`Payload is ${payload.length} bytes but the carrier only has room for ${capacity} bytes at ${n} bit(s)/byte`);
    const bits = [];
    const fillOrder = order === 'MSB first' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    for (const b of payload) for (const k of fillOrder) bits.push((b >> k) & 1);
    const out = new Uint8Array(data);
    let bi = 0;
    for (let i = skip; i < out.length; i++) {
      if (bi >= bits.length) break;
      const chunk = bits.slice(bi, bi + n);
      bi += chunk.length;
      const seq = order === 'MSB first' ? chunk : chunk.slice().reverse();
      let val = 0;
      for (const bit of seq) val = (val << 1) | bit;
      if (chunk.length < n) val <<= (n - chunk.length);
      out[i] = (out[i] & ~((1 << n) - 1)) | val;
    }
    return out;
  });
