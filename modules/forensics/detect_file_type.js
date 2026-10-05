import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { detect } from '../../core/filetypes.js';
import { decodeUtf8 } from '../../core/util.js';

module('Detect File Type', 'Identifies the file type from magic bytes at the start of the data.', [A.boolean('Show MIME type', true)],
  (data, mime) => {
    const found = detect(data);
    if (!found.length) {
      try { decodeUtf8(data.subarray(0, 2000)); if (!/�/.test(decodeUtf8(data.subarray(0, 2000)))) return 'Plain text (UTF-8 compatible) - no binary signature found.'; }
      catch { /* fall through */ }
      return 'Unknown file type.';
    }
    return found.map(([n, e, m]) => `${n}\n  Extension: ${e}` + (mime ? `\n  MIME type: ${m}` : '')).join('\n');
  });
