import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('ROT47', 'Rotates all printable ASCII characters (33-126) by an amount; 47 by default.', [A.number('Amount', 47)],
  (t, amount) => [...t].map(c => { const o = c.codePointAt(0); return o >= 33 && o <= 126 ? String.fromCharCode(33 + (((o - 33 + amount) % 94) + 94) % 94) : c; }).join(''), { text: true });
