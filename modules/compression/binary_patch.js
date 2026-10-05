import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { unescapeLatin1, findSub } from './_bytes.js';

module('Binary Patch', 'Applies a patch from Binary Diff to the OLD data to reconstruct NEW.', [A.string('Patch separator', '\\0PATCH\\0')],
  (data, sepS) => {
    const sep = unescapeLatin1(sepS);
    const splitAt = findSub(data, sep);
    if (splitAt < 0) throw new Error('Separator not found: provide OLD data, the separator, then the patch (from Binary Diff)');
    const old = data.subarray(0, splitAt);
    const patch = data.subarray(splitAt + sep.length);
    const out = [];
    let i = 0;
    while (i < patch.length) {
      const op = patch[i]; i++;
      if (op === 0x4C) {
        const n = (patch[i] << 8) | patch[i + 1]; i += 2;
        for (let k = 0; k < n; k++) out.push(patch[i + k]);
        i += n;
      } else if (op === 0x43) {
        const off = ((patch[i] << 24) | (patch[i + 1] << 16) | (patch[i + 2] << 8) | patch[i + 3]) >>> 0;
        const len = ((patch[i + 4] << 24) | (patch[i + 5] << 16) | (patch[i + 6] << 8) | patch[i + 7]) >>> 0;
        i += 8;
        for (let k = 0; k < len; k++) out.push(old[off + k]);
      } else {
        throw new Error(`Corrupt patch at offset ${i - 1}`);
      }
    }
    return Uint8Array.from(out);
  });
