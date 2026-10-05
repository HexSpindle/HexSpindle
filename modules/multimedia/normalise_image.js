import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

function buildLut(hist, cutPct) {
  const h = hist.slice();
  const n = h.reduce((a, b) => a + b, 0);
  if (cutPct) {
    let cut = Math.floor((n * cutPct) / 100);
    for (let lo = 0; lo < 256 && cut > 0; lo++) {
      if (cut > h[lo]) { cut -= h[lo]; h[lo] = 0; } else { h[lo] -= cut; cut = 0; }
    }
    cut = Math.floor((n * cutPct) / 100);
    for (let hi = 255; hi >= 0 && cut > 0; hi--) {
      if (cut > h[hi]) { cut -= h[hi]; h[hi] = 0; } else { h[hi] -= cut; cut = 0; }
    }
  }
  let lo = 0; while (lo < 256 && !h[lo]) lo++;
  if (lo === 256) lo = 0;
  let hi = 255; while (hi >= 0 && !h[hi]) hi--;
  if (hi < 0) hi = 255;
  const lut = new Uint8Array(256);
  if (hi <= lo) { for (let i = 0; i < 256; i++) lut[i] = i; return lut; }
  const scale = 255 / (hi - lo), offset = -lo * scale;
  for (let i = 0; i < 256; i++) lut[i] = Math.min(255, Math.max(0, Math.round(i * scale + offset)));
  return lut;
}

module('Normalise Image', "Stretches the image's contrast to use the full tonal range.", [A.number('Cut-off (%)', 0, 0, 49)],
  async (data, cut) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const hists = [new Array(256).fill(0), new Array(256).fill(0), new Array(256).fill(0)];
    for (let i = 0; i < img.data.length; i += 4) for (let c = 0; c < 3; c++) hists[c][img.data[i + c]]++;
    const luts = hists.map(h => buildLut(h, cut));
    for (let i = 0; i < img.data.length; i += 4) for (let c = 0; c < 3; c++) img.data[i + c] = luts[c][img.data[i + c]];
    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  });
