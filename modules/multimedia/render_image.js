import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { detect } from '../../core/filetypes.js';
import { base64Decode, parseHex, decodeLatin1 } from '../../core/util.js';

module('Render Image',
  'Checks that the input is an image (PNG, JPEG, GIF, BMP, WebP, ICO or SVG), decoding it from ' +
  'Base64 or hex first if asked, and passes the image bytes through - the output pane displays them ' +
  'as a picture. Anything that is not an image is rejected rather than shown as broken image.',
  [A.select('Input format', ['Raw', 'Base64', 'Hex'])],
  (data, fmt) => {
    if (fmt === 'Base64') data = base64Decode(decodeLatin1(data));
    else if (fmt === 'Hex') data = parseHex(decodeLatin1(data));
    if (!data.length) return new Uint8Array(0);
    const mime = detect(data).map(([, , m]) => m).find(m => m.startsWith('image/'));
    if (!mime) {
      const head = decodeLatin1(data).trimStart().slice(0, 5);
      if (head !== '<?xml' && head !== '<svg ') throw new Error('Invalid file type');
    }
    return data;
  });
