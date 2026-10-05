import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { concatBytes } from '../../core/util.js';

module('To TLV', 'Wraps the input as a single BER-style tag-length-value record.', [A.number('Tag', 4, 0, 255)],
  (data, tag) => {
    const n = data.length;
    let ln;
    if (n < 128) {
      ln = new Uint8Array([n]);
    } else {
      const nbytes = Math.ceil(n.toString(2).length / 8);
      const bytes = [];
      let v = n;
      for (let i = 0; i < nbytes; i++) { bytes.unshift(v & 0xff); v = Math.floor(v / 256); }
      ln = new Uint8Array([0x80 | nbytes, ...bytes]);
    }
    return concatBytes([new Uint8Array([tag]), ln, data]);
  });
