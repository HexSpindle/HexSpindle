import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Format MAC addresses', 'Re-formats MAC addresses into hyphen, colon, Cisco-dotted and plain styles.',
  [A.select('Output case', ['Both', 'Upper only', 'Lower only']), A.boolean('Hyphen-delimited', true), A.boolean('Colon-delimited', true),
    A.boolean('Cisco style (dotted)', false), A.boolean('No delimiters', true), A.boolean('IPv6 interface ID', false)],
  (t, kase, hy, co, ci, no, v6 = false) => {
    if (!t) return '';
    const out = [];
    for (const mac of t.toLowerCase().split(/[,\s\r\n]+/)) {
      const clean = mac.replace(/[:.-]+/g, '');
      let ipv6 = (clean.slice(0, 6) + 'fffe' + clean.slice(6)).replace(/(.{4}(?=.))/g, '$1:');
      ipv6 = (parseInt(ipv6.slice(0, 2), 16) ^ 2).toString(16).padStart(2, '0') + ipv6.slice(2);
      const forms = [];
      if (no) forms.push(clean);
      if (hy) forms.push(clean.replace(/(.{2}(?=.))/g, '$1-'));
      if (co) forms.push(clean.replace(/(.{2}(?=.))/g, '$1:'));
      if (ci) forms.push(clean.replace(/(.{4}(?=.))/g, '$1.'));
      if (v6) forms.push(ipv6);
      for (const f of forms) {
        if (kase === 'Lower only') out.push(f);
        else if (kase === 'Upper only') out.push(f.toUpperCase());
        else out.push(f, f.toUpperCase());
      }
      out.push('');
    }
    return out.join('\n');
  }, { text: true });
