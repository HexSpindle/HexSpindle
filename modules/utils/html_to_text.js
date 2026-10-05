import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function recursiveRemove(pattern, str) {
  const next = str.replace(pattern, '');
  return next.length === str.length ? next : recursiveRemove(pattern, next);
}

const HTML_CHARS = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#x2F;': '/', '&#x60;': '`' };

module('HTML To Text', 'Strips HTML tags (removing <script>/<style> blocks entirely)',
  [],
  t => {
    let s = recursiveRemove(/<script[^>]*>[\s\S]*?<\/script[^>]*>/gi, t);
    s = recursiveRemove(/<style[^>]*>[\s\S]*?<\/style[^>]*>/gi, s);
    s = recursiveRemove(/<[^>]+>/g, s);
    return s.replace(/&#?x?[a-z0-9]{2,4};/gi, m => HTML_CHARS[m] || m);
  }, { text: true });
