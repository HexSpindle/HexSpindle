import { module } from './_cat.js';
import { decodeLatin1, concatBytes } from '../../core/util.js';

module('Dechunk HTTP response', 'Removes HTTP/1.1 chunked transfer-encoding framing, leaving the decoded body.', [],
  (data) => {
    const parts = [];
    let i = 0;
    while (i < data.length) {
      let j = -1;
      for (let k = i; k < data.length - 1; k++) if (data[k] === 0x0d && data[k + 1] === 0x0a) { j = k; break; }
      if (j === -1) break;
      const sizeLine = decodeLatin1(data.subarray(i, j)).split(';')[0];
      const size = parseInt(sizeLine, 16);
      if (Number.isNaN(size)) throw new Error(`Invalid chunk size at offset ${i}: ${JSON.stringify(sizeLine)}`);
      if (size === 0) break;
      parts.push(data.subarray(j + 2, j + 2 + size));
      i = j + 2 + size + 2;
    }
    return concatBytes(parts);
  });
