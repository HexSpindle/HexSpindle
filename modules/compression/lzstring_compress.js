import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { compress, compressToBase64, compressToEncodedURIComponent } from './_lzstring.js';

module('LZString Compress', 'Compresses text with LZString, the JavaScript library commonly used to pack data into URLs and localStorage (e.g. shared recipe links from browser-based data-transformation tools, or jsfiddle links).',
  [A.select('Output format', ['Base64', 'URI-safe (compressToEncodedURIComponent)', 'UTF-16'])],
  (t, fmt) => {
    if (fmt === 'Base64') return compressToBase64(t);
    if (fmt === 'URI-safe (compressToEncodedURIComponent)') return compressToEncodedURIComponent(t);
    return compress(t);
  }, { text: true });
