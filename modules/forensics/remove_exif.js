import { module } from './_cat.js';
import { concatBytes } from '../../core/util.js';

module('Remove EXIF', 'Strips EXIF (APP1) metadata segments from a JPEG file.', [],
  (data) => {
    if (!(data[0] === 0xff && data[1] === 0xd8)) throw new Error('Not a JPEG file');
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const parts = [data.subarray(0, 2)];
    let i = 2;
    while (i + 4 <= data.length && data[i] === 0xff) {
      const marker = data[i + 1];
      if (marker === 0xda) break;
      const ln = dv.getUint16(i + 2, false);
      const isExif = marker === 0xe1 && data[i + 4] === 0x45 && data[i + 5] === 0x78 && data[i + 6] === 0x69 && data[i + 7] === 0x66 && data[i + 8] === 0 && data[i + 9] === 0;
      if (!isExif) parts.push(data.subarray(i, i + 2 + ln));
      i += 2 + ln;
    }
    parts.push(data.subarray(i));
    return concatBytes(parts);
  });
