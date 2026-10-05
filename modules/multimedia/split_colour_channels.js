import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Split Colour Channels', 'Splits an image into R, G and B greyscale images and outputs them side by side as one PNG.', [A.select('Layout', ['Horizontal', 'Vertical'])],
  async (data, layout) => {
    const { ctx, width: w, height: h } = await loadImage(data);
    const img = ctx.getImageData(0, 0, w, h);
    const horizontal = layout === 'Horizontal';
    const sheet = new OffscreenCanvas(horizontal ? w * 3 : w, horizontal ? h : h * 3);
    const sctx = sheet.getContext('2d');
    const out = sctx.createImageData(sheet.width, sheet.height);
    for (let chan = 0; chan < 3; chan++) {
      const offX = horizontal ? chan * w : 0;
      const offY = horizontal ? 0 : chan * h;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const src = (y * w + x) * 4;
        const dst = ((offY + y) * sheet.width + (offX + x)) * 4;
        const v = img.data[src + chan];
        out.data[dst] = out.data[dst + 1] = out.data[dst + 2] = v;
        out.data[dst + 3] = 255;
      }
    }
    sctx.putImageData(out, 0, 0);
    return canvasToPng(sheet);
  });
