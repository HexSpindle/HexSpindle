import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { encodeUtf8 } from '../../core/util.js';
import { concat } from './_bytes.js';

function hdr(fields) {
  let s = '070701';
  for (const f of fields) s += f.toString(16).padStart(8, '0');
  return encodeUtf8(s);
}
function pad4(u8) {
  const n = (-u8.length) % 4;
  return n === 0 ? u8 : concat(u8, new Uint8Array((n + 4) % 4));
}

module('CPIO Create', "Creates a 'newc' format cpio archive containing the input as one file.", [A.string('Filename', 'file.txt')],
  (data, name) => {
    const nameB = concat(encodeUtf8(name), new Uint8Array([0]));
    const h = hdr([0, 0o100644, 0, 0, 1, 0, data.length, 0, 0, 0, 0, nameB.length, 0]);
    const trailerName = encodeUtf8('TRAILER!!!\0');
    const trailerH = hdr([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, trailerName.length, 0]);
    return concat(pad4(concat(h, nameB)), pad4(data), pad4(concat(trailerH, trailerName)));
  });
