import { module } from './_cat.js';

module('From COBS', 'Decodes COBS (Consistent Overhead Byte Stuffing) data back to its original form.', [],
  (data) => {
    if (data.length && data[data.length - 1] === 0) data = data.subarray(0, -1);
    const out = [];
    let i = 0;
    while (i < data.length) {
      const code = data[i];
      if (code === 0 || i + code - 1 > data.length) throw new Error('Invalid COBS data');
      for (let j = i + 1; j < i + code; j++) out.push(data[j]);
      i += code;
      if (code !== 0xff && i < data.length) out.push(0);
    }
    return new Uint8Array(out);
  });
