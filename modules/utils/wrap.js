import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Wrap', "Wraps the input text at a specified number of characters per line, splitting purely by character count (not at word boundaries). Existing line breaks are not preserved",
  [A.number('Line width', 64, 1, 65536)],
  (t, width) => {
    if (!t) return '';
    const chunks = t.match(new RegExp(`.{1,${width}}`, 'g'));
    return chunks ? chunks.join('\n') : '';
  }, { text: true });
