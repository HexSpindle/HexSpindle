import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { hammingHex } from './_phash.js';

module('Compare Perceptual Hashes',
  'Compares two perceptual hashes (hex) and reports their Hamming distance and similarity - low distance means visually similar images. Input: HASH1<separator>HASH2.',
  [A.string('Separator', ' ')],
  (t, sep) => {
    const parts = t.trim().split(sep);
    if (parts.length !== 2) throw new Error(`Expected exactly two hashes separated by ${JSON.stringify(sep)}`);
    const [a, b] = parts;
    const dist = hammingHex(a, b);
    const bits = a.length * 4;
    const sim = 100 * (1 - dist / bits);
    const verdict = sim > 95 ? 'Likely identical/near-identical' : sim > 85 ? 'Likely similar' : sim > 70 ? 'Possibly related' : 'Likely different images';
    return `Hamming distance: ${dist} / ${bits} bits\nSimilarity: ${sim.toFixed(1)}%\nVerdict: ${verdict}`;
  }, { text: true });
