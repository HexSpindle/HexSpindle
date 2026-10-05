import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function unicodeEscape(s) {
  return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\\\/g, '\\');
}

module('Compare MinHash Signatures', 'Estimates Jaccard similarity between two MinHash signatures (space-separated numbers, same length). Input: SIG1<separator>SIG2.',
  [A.string('Separator', '\\n')],
  (t, sep) => {
    sep = unicodeEscape(sep);
    const parts = t.trim().split(sep);
    if (parts.length !== 2) throw new Error(`Expected exactly two signatures separated by ${JSON.stringify(sep)}`);
    const a = parts[0].split(/\s+/).filter(Boolean).map(Number);
    const b = parts[1].split(/\s+/).filter(Boolean).map(Number);
    if (a.length !== b.length) throw new Error('Signatures must have the same length');
    const agree = a.reduce((n, x, i) => n + (x === b[i] ? 1 : 0), 0);
    const sim = 100 * agree / a.length;
    return `Estimated Jaccard similarity: ${sim.toFixed(1)}%  (${agree} / ${a.length} hash functions agree)`;
  }, { text: true });
