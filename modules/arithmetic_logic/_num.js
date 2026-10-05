import { delim } from '../../core/util.js';

export function parseNumbers(text, d = 'Line feed') {
  const sep = delim(d);
  const parts = sep ? text.split(sep) : (text.match(/\S+/g) || []);
  const out = [];
  for (let p of parts) {
    p = p.trim();
    if (!p) continue;
    if (/^-?0[xX][0-9a-fA-F]+$/.test(p)) {
      const neg = p[0] === '-';
      out.push((neg ? -1 : 1) * parseInt(neg ? p.slice(1) : p, 16));
    } else if (/^[-+]?\d+$/.test(p)) {
      out.push(parseInt(p, 10));
    } else if (/^[-+]?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?$/.test(p)) {
      out.push(parseFloat(p));
    }
  }
  return out;
}
