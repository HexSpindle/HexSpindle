import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { canvasToPng } from './_img.js';

module('Generate Image', 'Turns the input bytes into an image: each byte (or bit) becomes a pixel.',
  [A.select('Mode', ['Greyscale', 'RGB', 'RGBA', 'Bits']), A.number('Pixel scale factor', 8, 1, 64), A.number('Pixels per row (0 = auto)', 64, 0)],
  async (data, mode, scale, perRow) => {
    let vals, chans;
    if (mode === 'Bits') {
      chans = 1;
      vals = new Uint8Array(data.length * 8);
      let k = 0;
      for (const b of data) for (let i = 7; i >= 0; i--) vals[k++] = (b >> i) & 1 ? 255 : 0;
    } else {
      chans = mode === 'Greyscale' ? 1 : mode === 'RGB' ? 3 : 4;
      vals = data;
    }
    const n = Math.floor(vals.length / chans);
    if (n === 0) throw new Error('Not enough data');
    const w = perRow || Math.max(1, Math.ceil(Math.sqrt(n)));
    const h = Math.ceil(n / w);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let p = 0; p < w * h; p++) {
      const o = p * 4;
      const base = p * chans;
      if (p >= n) { img.data[o] = img.data[o + 1] = img.data[o + 2] = 0; img.data[o + 3] = 255; continue; }
      if (chans === 1) { img.data[o] = img.data[o + 1] = img.data[o + 2] = vals[base]; img.data[o + 3] = 255; }
      else if (chans === 3) { img.data[o] = vals[base]; img.data[o + 1] = vals[base + 1]; img.data[o + 2] = vals[base + 2]; img.data[o + 3] = 255; }
      else { img.data[o] = vals[base]; img.data[o + 1] = vals[base + 1]; img.data[o + 2] = vals[base + 2]; img.data[o + 3] = vals[base + 3]; }
    }
    ctx.putImageData(img, 0, 0);
    if (scale > 1) {
      const scaled = new OffscreenCanvas(w * scale, h * scale);
      const sctx = scaled.getContext('2d');
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(canvas, 0, 0, w * scale, h * scale);
      return canvasToPng(scaled);
    }
    return canvasToPng(canvas);
  });
