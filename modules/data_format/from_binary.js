import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, decodeLatin1 } from '../../core/util.js';

module('From Binary', 'Converts binary text back to bytes.', [A.select('Delimiter', DELIMS), A.number('Byte length', 8, 1, 64)],
  (data, d, bl) => {
    const s = decodeLatin1(data).replace(/[^01]/g, '');
    const out = [];
    for (let i = 0; i + bl <= s.length; i += bl) out.push(parseInt(s.slice(i, i + bl), 2) & 255);
    return new Uint8Array(out);
  });
