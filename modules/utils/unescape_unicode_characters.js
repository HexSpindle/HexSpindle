import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

module('Unescape Unicode Characters', 'Converts \\uXXXX style escapes back to characters.', [A.select('Prefix', ['\\u', '%u', 'U+'])],
  (t, prefix) => t.replace(new RegExp(escapeRegExp(prefix) + '([0-9a-fA-F]{4,6})', 'g'), (m, hex) => String.fromCodePoint(parseInt(hex, 16))), { text: true });
