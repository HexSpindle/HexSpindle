import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('LZF Decompress', "Decompresses LZF data. liblzf does not store the original size, so provide an upper bound.", [A.number('Max decompressed size', 1 << 20, 1)],
  (data, maxsize) => {
    const out = [];
    let i = 0;
    try {
      while (i < data.length) {
        const ctrl = data[i++];
        if (ctrl < 32) {
          const len = ctrl + 1;
          for (let k = 0; k < len; k++) out.push(data[i++]);
        } else {
          let len = ctrl >> 5;
          if (len === 7) len += data[i++];
          len += 2;
          let ref = out.length - ((ctrl & 0x1F) << 8) - 1 - data[i++];
          if (ref < 0) throw new Error('bad reference');
          for (let k = 0; k < len; k++) { out.push(out[ref]); ref++; }
        }
        if (out.length > maxsize) throw new Error('too big');
      }
    } catch {
      throw new Error("Decompression failed, or 'Max decompressed size' is too small");
    }
    return Uint8Array.from(out);
  });
