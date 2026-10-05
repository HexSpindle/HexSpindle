import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';

module('To Float', 'Interprets bytes as IEEE-754 floating point numbers.',
  [A.select('Endianness', ['Big Endian', 'Little Endian']), A.select('Size', ['Float (4 bytes)', 'Double (8 bytes)']), A.select('Delimiter', DELIMS)],
  (data, end, size, d) => {
    const n = size.startsWith('Float') ? 4 : 8;
    const little = end.startsWith('Little');
    const out = [];
    for (let i = 0; i + n <= data.length; i += n) {
      const dv = new DataView(data.buffer, data.byteOffset + i, n);
      const v = n === 4 ? dv.getFloat32(0, little) : dv.getFloat64(0, little);
      out.push(Number.isNaN(v) ? 'nan' : v === Infinity ? 'inf' : v === -Infinity ? '-inf' : String(v));
    }
    return out.join(delim(d));
  });
