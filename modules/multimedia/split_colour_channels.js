import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToPng } from './_img.js';

module('Split Colour Channels',
  'Splits an image into its red, green and blue channels. Each channel keeps only its own colour ' +
  'and zeroes the other two. Horizontal and Vertical lay the three channels out as one image; ' +
  'Red, Green and Blue output that single channel as its own PNG.',
  [A.select('Layout', ['Horizontal', 'Vertical', 'Red', 'Green', 'Blue'])],
  async (data, layout) => {
    const src = await loadBitmap(data);
    const single = ['Red', 'Green', 'Blue'].indexOf(layout);
    if (single >= 0) {
      const out = { data: new Uint8Array(src.data), width: src.width, height: src.height };
      for (let i = 0; i < out.data.length; i += 4)
        for (let c = 0; c < 3; c++) if (c !== single) out.data[i + c] = 0;
      return bitmapToPng(out);
    }
    const w = src.width, h = src.height;
    const horizontal = layout === 'Horizontal';
    const sheet = {
      data: new Uint8Array((horizontal ? w * 3 : w) * (horizontal ? h : h * 3) * 4),
      width: horizontal ? w * 3 : w,
      height: horizontal ? h : h * 3,
    };
    for (let chan = 0; chan < 3; chan++) {
      const offX = horizontal ? chan * w : 0;
      const offY = horizontal ? 0 : chan * h;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const s = (y * w + x) * 4;
          const d = ((offY + y) * sheet.width + (offX + x)) * 4;
          sheet.data[d + chan] = src.data[s + chan];
          sheet.data[d + 3] = src.data[s + 3];
        }
      }
    }
    return bitmapToPng(sheet);
  });
