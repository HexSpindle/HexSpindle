import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Escape string', 'Escapes special characters for use in a string literal.',
  [A.select('Escape level', ['Special chars', 'Everything', 'Minimal']), A.select('Escape quote', ['Single', 'Double', 'Backtick']),
   A.boolean('JSON compatible', false), A.boolean('ES6 compatible', true), A.boolean('Uppercase hex', false)],
  (t, level, quote, js, es6, upper) => {
    const q = { Single: "'", Double: '"', Backtick: '`' }[quote];
    const hx = (n, w) => { let s = n.toString(16); if (upper) s = s.toUpperCase(); return s.padStart(w, '0'); };
    const out = [];
    for (const c of t) {
      const o = c.codePointAt(0);
      if (level === 'Everything') {
        if (o < 256) out.push('\\x' + hx(o, 2));
        else if (o < 65536) out.push('\\u' + hx(o, 4));
        else if (es6 && !js) out.push('\\u{' + hx(o, 1) + '}');
        else out.push('\\u' + hx(c.charCodeAt(0), 4) + '\\u' + hx(c.charCodeAt(1), 4));
      } else if (c === '\\') out.push('\\\\');
      else if (c === q) out.push('\\' + q);
      else if (c === '\n') out.push('\\n');
      else if (c === '\r') out.push('\\r');
      else if (c === '\t') out.push('\\t');
      else if (level === 'Minimal') out.push(c);
      else if (c === '\b') out.push('\\b');
      else if (c === '\f') out.push('\\f');
      else if (c === '\v') out.push(js ? '\\u000b' : '\\v');
      else if (o < 32 || o === 127) out.push('\\x' + hx(o, 2));
      else out.push(c);
    }
    return out.join('');
  }, { text: true });
