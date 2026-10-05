import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const MAC_RE = /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g;

module('Extract MAC addresses', 'Pulls MAC addresses out of text.', [A.boolean('Unique', true)],
  (t, uniq) => { let found = t.match(MAC_RE) || []; if (uniq) found = [...new Set(found)]; return found.join('\n'); }, { text: true });
