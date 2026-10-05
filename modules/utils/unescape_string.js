import { module } from './_cat.js';

const ESC = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0', "'": "'", '"': '"', '`': '`', '\\': '\\' };

module('Unescape string', 'Reverses string escaping (\\n, \\xHH, \\uHHHH, \\u{...}, octal).', [],
  (t) => t.replace(/\\(x[0-9a-fA-F]{2}|u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|[0-7]{1,3}|.)/gs, (m, g) => {
    if (g[0] === 'x') return String.fromCharCode(parseInt(g.slice(1), 16));
    if (g[0] === 'u') return String.fromCodePoint(parseInt(g.slice(1).replace(/[{}]/g, ''), 16));
    if ('01234567'.includes(g[0]) && g.length > 1) return String.fromCharCode(parseInt(g, 8));
    return ESC[g] ?? ('\\' + g);
  }), { text: true });
