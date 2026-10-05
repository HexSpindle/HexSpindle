import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

function rgb2hsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const v = max;
  const s = max === 0 ? 0 : Math.floor((delta * 255) / max);
  let h = 0;
  if (delta !== 0) {
    let hh;
    if (max === r) hh = ((g - b) / delta) % 6;
    else if (max === g) hh = (b - r) / delta + 2;
    else hh = (r - g) / delta + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
    h = Math.floor((hh / 360) * 255);
    if (h >= 255) h -= 255;
  }
  return [h, s, v];
}

function hsv2rgb(h, s, v) {
  if (s === 0) return [v, v, v];
  const hh = (h / 255) * 6;
  const i = Math.floor(hh);
  const f = hh - i;
  const p = Math.floor((v * (255 - s)) / 255);
  const q = Math.floor((v * (255 - s * f)) / 255);
  const t = Math.floor((v * (255 - s * (1 - f))) / 255);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

module('Image Hue/Saturation/Lightness', 'Shifts hue (degrees) and scales saturation / lightness (1.0 = unchanged).',
  [A.number('Hue shift (°)', 0, -180, 180), A.number('Saturation', 1.0, 0, 5, 0.1), A.number('Lightness', 1.0, 0, 5, 0.1)],
  async (data, hue, sat, light) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const hueShift = Math.trunc((hue / 360) * 256);
    for (let i = 0; i < img.data.length; i += 4) {
      let [h, s, v] = rgb2hsv(img.data[i], img.data[i + 1], img.data[i + 2]);
      h = ((h + hueShift) % 256 + 256) % 256;
      s = Math.min(255, Math.trunc(s * sat));
      v = Math.min(255, Math.trunc(v * light));
      const [r, g, b] = hsv2rgb(h, s, v);
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b;
    }
    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  });
