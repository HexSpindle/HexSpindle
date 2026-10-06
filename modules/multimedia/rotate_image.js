import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { matrixRotate, advancedRotate } from './_jimp.js';
import { loadImage, canvasToPng } from './_img.js';

module('Rotate Image',
  'Rotates an image by an angle (degrees, anti-clockwise). Multiples of 90 degrees are a loss-free ' +
  'pixel permutation. Other angles grow the canvas so nothing is cut off and sample the rotated ' +
  'source; with "Expand canvas" off the result is cropped back to the original size instead.',
  [A.number('Rotation amount (degrees)', 90), A.boolean('Expand canvas', true)],
  async (data, deg, expand) => {
    if (expand) {
      const bm = await loadBitmap(data);
      const d = deg % 360;
      if (d === 0) return bitmapToOutput(bm, data);
      return bitmapToOutput(d % 90 === 0 ? matrixRotate(bm, d) : advancedRotate(bm, d), data);
    }
    // Fixed-size rotation isn't something Jimp can do, so it stays a canvas transform.
    const { canvas: src, width, height } = await loadImage(data);
    const out = new OffscreenCanvas(width, height);
    const ctx = out.getContext('2d');
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-deg * Math.PI) / 180);
    ctx.drawImage(src, -width / 2, -height / 2);
    return canvasToPng(out);
  });
