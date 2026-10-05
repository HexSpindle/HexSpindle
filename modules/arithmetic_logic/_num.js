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
    } else if (/^-?0[bB][01]+$/.test(p) || /^-?0[oO][0-7]+$/.test(p)) {
      const neg = p[0] === '-';
      out.push((neg ? -1 : 1) * parseInt(p.slice(neg ? 3 : 2), /[bB]/.test(p) ? 2 : 8));
    } else if (/^[-+]?Infinity$/.test(p)) {
      out.push(p[0] === '-' ? -Infinity : Infinity);
    } else if (/^[-+]?\d+$/.test(p)) {
      out.push(parseInt(p, 10));
    } else if (/^[-+]?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?$/.test(p)) {
      out.push(parseFloat(p));
    }
  }
  return out;
}
