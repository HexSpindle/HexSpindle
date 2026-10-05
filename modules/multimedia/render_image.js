import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';
import { detect } from '../../core/filetypes.js';
import { base64Encode, base64Decode, parseHex, decodeLatin1 } from '../../core/util.js';

module('Render Image', 'Displays the input bytes as an image (PNG, JPEG, GIF, BMP, WebP, SVG...).', [A.select('Input format', ['Raw', 'Base64', 'Hex'])],
  (data, fmt) => {
    if (fmt === 'Base64') data = base64Decode(decodeLatin1(data));
    else if (fmt === 'Hex') data = parseHex(decodeLatin1(data));
    let mime = detect(data).map(([, , m]) => m).find(m => m.startsWith('image/'));
    if (!mime) {
      const head = decodeLatin1(data).trimStart().slice(0, 5);
      if (head === '<?xml' || head === '<svg ') mime = 'image/svg+xml';
      else throw new Error('Input does not look like an image');
    }
    return new Html(`<img alt="rendered image" style="max-width:100%;image-rendering:auto" src="data:${mime};base64,${base64Encode(data)}">`);
  });
