import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS } from '../../core/util.js';

module('From Float', 'Packs floating point numbers (as text) into bytes.',
  [A.select('Endianness', ['Big Endian', 'Little Endian']), A.select('Size', ['Float (4 bytes)', 'Double (8 bytes)']), A.select('Delimiter', DELIMS)],
  (t, end, size) => {
    const n = size.startsWith('Float') ? 4 : 8;
    const little = end.startsWith('Little');
    const matches = t.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|nan|inf/g) || [];
    const out = new Uint8Array(matches.length * n);
    const dv = new DataView(out.buffer);
    matches.forEach((m, i) => {
      const v = m === 'nan' ? NaN : m === 'inf' ? Infinity : parseFloat(m);
      if (n === 4) dv.setFloat32(i * n, v, little); else dv.setFloat64(i * n, v, little);
    });
    return out;
  }, { text: true });
