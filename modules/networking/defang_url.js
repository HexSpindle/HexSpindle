import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const URL_RE = new RegExp('[A-Z]+://[-\\w]+(?:\\.\\w[-\\w]*)+(?::\\d+)?(?:/[^.!,?"<>\\[\\]{}\\s\\x7F-\\xFF]*(?:[.!,?]+[^.!,?"<>\\[\\]{}\\s\\x7F-\\xFF]+)*)?', 'ig');
const DOMAIN_RE = /\b((?=[a-z0-9-]{1,63}\.)(xn--)?[a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,63}\b/ig;

function defang(s, dots, http, slashes) {
  if (dots) s = s.replace(/\./g, '[.]');
  if (http) s = s.replace(/http/gi, 'hxxp');
  if (slashes) s = s.replace(/:\/\//g, '[://]');
  return s;
}

module('Defang URL', 'Makes URLs and domains safe to paste in a report (hxxp, [.], [://]).',
  [A.boolean('Escape dots', true), A.boolean('Escape http', true), A.boolean('Escape ://', true),
   A.select('Process', ['Valid domains and full URLs', 'Only full URLs', 'Everything'])],
  (t, dots, http, slashes, mode) => {
    const f = x => defang(x, dots, http, slashes);
    if (mode === 'Everything') return f(t);
    t = t.replace(URL_RE, f);
    if (mode === 'Valid domains and full URLs') t = t.replace(DOMAIN_RE, f);
    return t;
  }, { text: true });
