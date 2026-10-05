import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { detect } from '../../core/filetypes.js';

module('Detect File Type', 'Identifies the file type from magic bytes at the start of the data.', [A.boolean('Show MIME type', true)],
  (data, mime) => {
    const found = detect(data);
    if (!found.length) return 'Unknown file type. Have you tried checking the entropy of this data to determine whether it might be encrypted or compressed?';
    return found.map(([n, e, m]) => `${n}\n  Extension: ${e}` + (mime ? `\n  MIME type: ${m}` : '')).join('\n');
  });
