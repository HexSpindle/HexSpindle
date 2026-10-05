import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function parseTok(tok) {
  const nums = [...tok.matchAll(/\d+(?:\.\d+)?/g)].map(m => parseFloat(m[0]));
  const v = nums.reduce((sum, n, i) => sum + n / 60 ** i, 0);
  return /\b[SWsw]\b|^\s*-/.test(tok) ? -v : v;
}

module('Convert co-ordinate format', 'Converts a latitude/longitude pair between decimal degrees and degrees-minutes-seconds.',
  [A.select('Output format', ['Decimal Degrees', 'Degrees Minutes Seconds', 'Degrees Decimal Minutes'])],
  (t, fmt) => {
    const parts = t.trim().split(/[,;\n]|(?<=\b[NSns])\s+(?=[\d-])|(?<=\b[EWew])\s*/).filter(p => p && p.trim());
    if (parts.length < 2) throw new Error("Provide 'lat, lon'");
    const vals = [parseTok(parts[0]), parseTok(parts[1])];
    const hemis = [['N', 'S'], ['E', 'W']];
    const out = vals.map((v, i) => {
      const a = Math.abs(v);
      const h = v >= 0 ? hemis[i][0] : hemis[i][1];
      if (fmt === 'Decimal Degrees') return v.toFixed(6);
      if (fmt === 'Degrees Decimal Minutes') return `${Math.trunc(a)}° ${((a - Math.trunc(a)) * 60).toFixed(4)}' ${h}`;
      const m = (a - Math.trunc(a)) * 60;
      return `${Math.trunc(a)}° ${Math.trunc(m)}' ${((m - Math.trunc(m)) * 60).toFixed(2)}" ${h}`;
    });
    return out.join(', ');
  }, { text: true });
