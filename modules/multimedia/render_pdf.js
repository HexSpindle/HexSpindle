import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Decode, parseHex, decodeLatin1 } from '../../core/util.js';

module('Render PDF',
  "Checks that the input is a PDF, decoding it from Base64 or hex first if asked, and passes the " +
  "bytes through - the output pane previews them with the browser's built-in PDF viewer.",
  [A.select('Input format', ['Raw', 'Base64', 'Hex'])],
  (data, fmt) => {
    if (fmt === 'Base64') data = base64Decode(decodeLatin1(data));
    else if (fmt === 'Hex') data = parseHex(decodeLatin1(data));
    if (!data.length) return new Uint8Array(0);
    if (decodeLatin1(data.subarray(0, 4)) !== '%PDF') throw new Error('Input does not appear to be a PDF file.');
    return data;
  }
);
