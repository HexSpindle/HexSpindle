import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decompress, decompressFromBase64, decompressFromEncodedURIComponent } from './_lzstring.js';

module('LZString Decompress', 'Decompresses LZString data (as produced by the JS library, e.g. from a URL or localStorage).',
  [A.select('Input format', ['Base64', 'URI-safe (decompressFromEncodedURIComponent)', 'UTF-16'])],
  (t, fmt) => {
    let out;
    try {
      out = fmt === 'Base64' ? decompressFromBase64(t) : fmt.startsWith('URI') ? decompressFromEncodedURIComponent(t) : decompress(t);
    } catch {
      out = null;
    }
    if (out === null || out === undefined) throw new Error('Could not decompress: not valid LZString data for this format');
    return out;
  }, { text: true });
