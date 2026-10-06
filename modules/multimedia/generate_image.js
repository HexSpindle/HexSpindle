import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { encodePng } from './_png.js';

const BYTES_PER_PIXEL = { Greyscale: 1, RG: 2, RGB: 3, RGBA: 4, Bits: 1 / 8 };

module('Generate Image', 'Turns the input bytes into an image: each byte (or bit) becomes a pixel.',
  [A.select('Mode', ['Greyscale', 'RG', 'RGB', 'RGBA', 'Bits']), A.number('Pixel scale factor', 8, 1, 64), A.number('Pixels per row (0 = auto)', 64, 0)],
  async (data, mode, scale, perRow) => {
    const bpp = BYTES_PER_PIXEL[mode];
    if (!bpp) throw new Error(`Unsupported Mode: (${mode})`);
    if (data.length % bpp !== 0) throw new Error(`Number of bytes is not a divisor of ${bpp}`);
    const n = data.length / bpp;
    if (n === 0) throw new Error('Not enough data');
    scale = Math.max(1, Math.floor(scale));
    const w = Math.floor(perRow) || Math.max(1, Math.ceil(Math.sqrt(n)));
    const h = Math.ceil(n / w);
    const px = new Uint8Array(w * h * 4); // transparent black, like a new Jimp image
    for (let p = 0; p < n; p++) {
      const o = p * 4;
      let r = 0, g = 0, b = 0, a = 255;
      if (mode === 'Bits') { r = g = b = (data[p >> 3] >> (7 - (p & 7))) & 1 ? 0 : 255; }
      else {
        const i = p * bpp;
        if (mode === 'Greyscale') r = g = b = data[i];
        else if (mode === 'RG') { r = data[i]; g = data[i + 1]; }
        else { r = data[i]; g = data[i + 1]; b = data[i + 2]; if (mode === 'RGBA') a = data[i + 3]; }
      }
      px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = a;
    }
    if (scale === 1) return encodePng(px, w, h);
    const W = w * scale, H = h * scale, big = new Uint8Array(W * H * 4);
    const big32 = new Uint32Array(big.buffer), px32 = new Uint32Array(px.buffer);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) big32[y * W + x] = px32[Math.floor(y / scale) * w + Math.floor(x / scale)];
    return encodePng(big, W, H);
  });
