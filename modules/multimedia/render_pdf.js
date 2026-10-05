import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';
import { base64Encode, base64Decode, parseHex, decodeLatin1 } from '../../core/util.js';

module('Render PDF', "Displays a PDF's pages using the browser's built-in PDF viewer.",
  [A.select('Input format', ['Raw', 'Base64', 'Hex'])],
  (data, fmt) => {
    if (fmt === 'Base64') data = base64Decode(decodeLatin1(data));
    else if (fmt === 'Hex') data = parseHex(decodeLatin1(data));
    if (decodeLatin1(data.subarray(0, 5)) !== '%PDF-') throw new Error('Input does not appear to be a PDF file.');
    const b64 = base64Encode(data);
    return new Html(`<iframe title="PDF preview" src="data:application/pdf;base64,${b64}" style="width:100%;height:80vh;border:1px solid #8884;background:#fff"></iframe>`);
  }
);
