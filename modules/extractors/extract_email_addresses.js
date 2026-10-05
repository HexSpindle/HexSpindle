import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

module('Extract Email addresses', 'Pulls email addresses out of text.', [A.boolean('Unique', true)],
  (t, uniq) => { let found = t.match(EMAIL_RE) || []; if (uniq) found = [...new Set(found)]; return found.join('\n'); }, { text: true });
