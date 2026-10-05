import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ahash, dhash, phash, whash } from './_phash.js';

module('Perceptual Hash',
  'Computes a perceptual hash of an image (aHash/dHash/pHash/wHash) - visually similar images produce hashes that differ in only a few bits, unlike a cryptographic hash. Useful for near-duplicate detection.',
  [A.select('Algorithm', ['aHash (average)', 'dHash (difference)', 'pHash (DCT)', 'wHash (wavelet)']), A.number('Hash size', 8, 4, 32)],
  async (data, algo, size) => {
    if (algo.startsWith('aHash')) return ahash(data, size);
    if (algo.startsWith('dHash')) return dhash(data, size);
    if (algo.startsWith('pHash')) return phash(data, Math.max(size * 4, 32), size);
    return whash(data, size);
  });
