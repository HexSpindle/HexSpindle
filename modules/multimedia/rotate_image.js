import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Rotate Image', 'Rotates an image by an angle (degrees, counter-clockwise).', [A.number('Rotation amount (degrees)', 90), A.boolean('Expand canvas', true)],
  async (data, deg, expand) => {
    const { canvas: src, width, height } = await loadImage(data);
    const rad = (deg * Math.PI) / 180;
    let outW = width, outH = height;
    if (expand) {
      outW = Math.ceil(Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad)));
      outH = Math.ceil(Math.abs(width * Math.sin(rad)) + Math.abs(height * Math.cos(rad)));
    }
    const out = new OffscreenCanvas(outW, outH);
    const ctx = out.getContext('2d');
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate(-rad); // PIL rotates counter-clockwise for a positive angle
    ctx.drawImage(src, -width / 2, -height / 2);
    return canvasToPng(out);
  });
