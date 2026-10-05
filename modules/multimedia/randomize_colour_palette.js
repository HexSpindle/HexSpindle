import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';
import { md5 } from '../hashing/md5.js';

module('Randomize Colour Palette',
  "Randomises an image's colours by replacing each pixel's RGB value with the first 3 bytes of " +
  "MD5(seed + R + '.' + G + '.' + B). Because the replacement is a deterministic function of the " +
  'original colour, every pixel that shared a colour still shares a (new, scrambled) colour afterwards ' +
  '- so shapes/edges/text stay visible while the actual colours are randomised, which can reveal text ' +
  "or symbols hidden in a colour very similar to their surroundings (a Steganography technique). " +
  "Ported from Jimp-based implementation, which works the same way on any image - it " +
  'does not require or build an actual indexed colour palette, despite the name - but always sets the ' +
  'output alpha to fully opaque, discarding the original alpha channel; this port matches that.',
  [A.string('Seed', '')],
  async (data, seed) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const seedStr = seed || String(Math.random()).slice(2);
    const enc = new TextEncoder();
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const rgbString = `${d[i]}.${d[i + 1]}.${d[i + 2]}`;
      const hash = md5(enc.encode(seedStr + rgbString));
      d[i] = hash[0]; d[i + 1] = hash[1]; d[i + 2] = hash[2];
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  }, { nondeterministic: true });
