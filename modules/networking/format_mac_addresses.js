import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Format MAC addresses', 'Re-formats MAC addresses into hyphen, colon, Cisco-dotted and plain styles.',
  [A.select('Output case', ['Both', 'Upper only', 'Lower only']), A.boolean('Hyphen-delimited', true), A.boolean('Colon-delimited', true),
    A.boolean('Cisco style (dotted)', true), A.boolean('No delimiters', true)],
  (t, kase, hy, co, ci, no) => {
    const out = [];
    const re = /\b(?:[0-9A-Fa-f]{2}[:\-.]?){5}[0-9A-Fa-f]{2}\b|\b[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\b/g;
    let m;
    while ((m = re.exec(t)) !== null) {
      const h = m[0].replace(/[^0-9A-Fa-f]/g, '');
      if (h.length !== 12) continue;
      const forms = [];
      if (hy) forms.push([h.slice(0, 2), h.slice(2, 4), h.slice(4, 6), h.slice(6, 8), h.slice(8, 10), h.slice(10, 12)].join('-'));
      if (co) forms.push([h.slice(0, 2), h.slice(2, 4), h.slice(4, 6), h.slice(6, 8), h.slice(8, 10), h.slice(10, 12)].join(':'));
      if (ci) forms.push([h.slice(0, 4), h.slice(4, 8), h.slice(8, 12)].join('.'));
      if (no) forms.push(h);
      const cases = { Both: [s => s.toLowerCase(), s => s.toUpperCase()], 'Upper only': [s => s.toUpperCase()], 'Lower only': [s => s.toLowerCase()] }[kase];
      out.push(forms.flatMap(x => cases.map(f => f(x))).join(','));
    }
    return out.join('\n');
  }, { text: true });
