import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { md5 } from '../hashing/md5.js';

// One byte per character when every character fits in a byte, otherwise UTF-8.
function strToBytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 255) return new TextEncoder().encode(s);
    out[i] = c;
  }
  return out;
}

module('Randomize Colour Palette',
  "Randomises an image's colours by replacing each pixel's RGB value with the first 3 bytes of " +
  "MD5(seed + R + '.' + G + '.' + B). Because the replacement is a deterministic function of the " +
  'original colour, every pixel that shared a colour still shares a (new, scrambled) colour afterwards ' +
  '- so shapes/edges/text stay visible while the actual colours are randomised, which can reveal text ' +
  "or symbols hidden in a colour very similar to their surroundings (a Steganography technique). " +
  "It works the same way on any image - it " +
  'does not require or build an actual indexed colour palette, despite the name - but always sets the ' +
  'output alpha to fully opaque, discarding the original alpha channel; this port matches that.',
  [A.string('Seed', '')],
  async (data, seed) => {
    const bm = await loadBitmap(data);
    const seedStr = seed || String(Math.random()).slice(2);
    const d = bm.data;
    for (let i = 0; i < d.length; i += 4) {
      const hash = md5(strToBytes(seedStr + `${d[i]}.${d[i + 1]}.${d[i + 2]}`));
      d[i] = hash[0]; d[i + 1] = hash[1]; d[i + 2] = hash[2];
      d[i + 3] = 255;
    }
    return bitmapToOutput(bm, data);
  }, { nondeterministic: true });
