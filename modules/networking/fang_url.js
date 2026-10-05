import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Fang URL', 'Reverses defanging: hxxp -> http, [.] -> ., [://] -> ://.',
  [A.boolean('Restore dots', true), A.boolean('Restore http', true), A.boolean('Restore ://', true)],
  (t, dots, http, colon) => {
    if (dots) t = t.replaceAll('[.]', '.').replaceAll('(.)', '.');
    if (http) t = t.replace(/\bhxxp/gi, m => m === 'hxxp' ? 'http' : 'HTTP');
    if (colon) t = t.replaceAll('[://]', '://').replaceAll('[:]//', '://');
    return t;
  }, { text: true });
