import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;

module('Extract IP addresses', 'Pulls IPv4 addresses out of text.', [A.boolean('Sort', true), A.boolean('Unique', true)],
  (t, sort, uniq) => {
    let found = t.match(IPV4) || [];
    if (uniq) found = [...new Set(found)];
    if (sort) found.sort((a, b) => a.split('.').reduce((n, x) => n * 256 + +x, 0) - b.split('.').reduce((n, x) => n * 256 + +x, 0));
    return found.join('\n');
  }, { text: true });
