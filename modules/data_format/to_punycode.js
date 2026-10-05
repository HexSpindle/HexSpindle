import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128;

function digitToChar(d) { return d < 26 ? String.fromCharCode(97 + d) : String.fromCharCode(48 + (d - 26)); }

function adapt(delta, numPoints, firstTime) {
  delta = firstTime ? Math.floor(delta / DAMP) : Math.floor(delta / 2);
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) >> 1) { delta = Math.floor(delta / (BASE - TMIN)); k += BASE; }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

export function punyEncode(input) {
  const codePoints = [...input].map(c => c.codePointAt(0));
  let n = INITIAL_N, delta = 0, bias = INITIAL_BIAS;
  const output = [];
  for (const cp of codePoints) if (cp < 128) output.push(String.fromCharCode(cp));
  let h = output.length;
  const b = h;
  if (b > 0) output.push('-');
  while (h < codePoints.length) {
    let m = Infinity;
    for (const cp of codePoints) if (cp >= n && cp < m) m = cp;
    delta += (m - n) * (h + 1);
    n = m;
    for (const cp of codePoints) {
      if (cp < n) delta++;
      if (cp === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? TMIN : (k >= bias + TMAX ? TMAX : k - bias);
          if (q < t) break;
          output.push(digitToChar(t + (q - t) % (BASE - t)));
          q = Math.floor((q - t) / (BASE - t));
        }
        output.push(digitToChar(q));
        bias = adapt(delta, h + 1, h === b);
        delta = 0;
        h++;
      }
    }
    delta++;
    n++;
  }
  return output.join('');
}

function toAsciiLabel(label) {
  if (/^[\x00-\x7f]*$/.test(label)) return label;
  const prepped = label.normalize('NFKC').toLowerCase();
  if (/^[\x00-\x7f]*$/.test(prepped)) return prepped;
  if (prepped.toLowerCase().startsWith('xn--')) throw new Error('Label starts with ACE prefix');
  return 'xn--' + punyEncode(prepped);
}

module('To Punycode', 'Encodes Unicode text as Punycode.', [A.boolean('Internationalised domain name', false)],
  (t, idn) => {
    if (!idn) return punyEncode(t);
    if (/^[\x00-\x7f]*$/.test(t)) return t;
    const dots = /[.。．｡]/;
    const parts = t.split(dots);
    let trailingDot = '';
    if (parts.length && parts[parts.length - 1] === '') { trailingDot = '.'; parts.pop(); }
    return parts.map(toAsciiLabel).join('.') + trailingDot;
  }, { text: true });
