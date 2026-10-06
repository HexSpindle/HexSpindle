import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToPng } from './_img.js';

module('Split Colour Channels',
  "Splits an image into its red, green and blue channels and lays them out side by side as one PNG. " +
  'Each panel keeps only its own channel and zeroes the other two, the standard split ' +
  '- other tools return them as three separate files (red.png, green.png, blue.png), which a ' +
  'single-output engine like this one cannot, hence the contact sheet.',
  [A.select('Layout', ['Horizontal', 'Vertical'])],
  async (data, layout) => {
    const src = await loadBitmap(data);
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
