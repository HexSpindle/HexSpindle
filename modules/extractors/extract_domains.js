import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const DOMAIN_RE = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g;

module('Extract Domains', 'Pulls domain names out of text.', [A.boolean('Unique', true)],
  (t, uniq) => { let found = t.match(DOMAIN_RE) || []; if (uniq) found = [...new Set(found)]; return found.join('\n'); }, { text: true });
