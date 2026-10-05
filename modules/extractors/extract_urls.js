import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const URL_RE = /\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s<>"']+/g;

module('Extract URLs', 'Pulls URLs out of text.', [A.boolean('Unique', true)],
  (t, uniq) => { let found = t.match(URL_RE) || []; if (uniq) found = [...new Set(found)]; return found.join('\n'); }, { text: true });
