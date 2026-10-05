import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex, decodeLatin1 } from '../../core/util.js';

module('Parse TLV', 'Splits BER-style tag-length-value records into a readable list.', [A.boolean('Show values as hex', true)],
  (data, hexv) => {
    const out = [];
    let i = 0;
    while (i < data.length) {
      const tag = data[i];
      let ln = data[i + 1];
      i += 2;
      if (ln & 0x80) {
        const k = ln & 0x7f;
        ln = 0;
        for (let j = 0; j < k; j++) ln = ln * 256 + data[i + j];
        i += k;
      }
      const val = data.subarray(i, i + ln);
      out.push(`Tag 0x${tag.toString(16).padStart(2, '0')}  Length ${ln}  Value ${hexv ? bytesToHex(val) : decodeLatin1(val)}`);
      i += ln;
    }
    return out.join('\n');
  });
