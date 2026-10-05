import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128;

function charToDigit(code) {
  if (code >= 48 && code <= 57) return code - 22;
  if (code >= 65 && code <= 90) return code - 65;
  if (code >= 97 && code <= 122) return code - 97;
  throw new Error('Invalid punycode digit');
}

function adapt(delta, numPoints, firstTime) {
  delta = firstTime ? Math.floor(delta / DAMP) : Math.floor(delta / 2);
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) >> 1) { delta = Math.floor(delta / (BASE - TMIN)); k += BASE; }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

export function punyDecode(input) {
  const output = [];
  let n = INITIAL_N, i = 0, bias = INITIAL_BIAS;
  let basicLength = input.lastIndexOf('-');
  if (basicLength < 0) basicLength = 0;
  for (let j = 0; j < basicLength; j++) output.push(input.charCodeAt(j));
  let index = basicLength > 0 ? basicLength + 1 : 0;
  const inputLength = input.length;
  while (index < inputLength) {
    const oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (index >= inputLength) throw new Error('Invalid punycode');
      const digit = charToDigit(input.charCodeAt(index++));
      i += digit * w;
      const t = k <= bias ? TMIN : (k >= bias + TMAX ? TMAX : k - bias);
      if (digit < t) break;
      w *= (BASE - t);
    }
    bias = adapt(i - oldi, output.length + 1, oldi === 0);
    n += Math.floor(i / (output.length + 1));
    i %= (output.length + 1);
    output.splice(i, 0, n);
    i++;
  }
  return String.fromCodePoint(...output);
}

module('From Punycode', 'Decodes Punycode text.', [A.boolean('Internationalised domain name', false)],
  (t, idn) => {
    t = t.trim();
    if (!idn) return punyDecode(t);
    if (!t.includes('xn--')) return t;
    const parts = t.split('.');
    let trailingDot = '';
    if (parts.length && parts[parts.length - 1] === '') { trailingDot = '.'; parts.pop(); }
    return parts.map(label => label.startsWith('xn--') ? punyDecode(label.slice(4)) : label).join('.') + trailingDot;
  }, { text: true });
