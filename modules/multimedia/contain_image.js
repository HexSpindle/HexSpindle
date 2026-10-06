import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { contain, blit, RESIZE_MODES } from './_jimp.js';

function parseBackground(css) {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(css).trim());
  if (!m) throw new Error('Background must be a #rrggbb or #rrggbbaa colour');
  return (parseInt(m[1], 16) * 256 + (m[2] === undefined ? 255 : parseInt(m[2], 16))) >>> 0;
}

module('Contain Image',
  'Scales an image to fit inside a box without cropping it (letterboxing), then pads the rest with ' +
  'the background colour when "Opaque background" is on - otherwise the padding is left transparent.',
  [A.number('Width', 100, 1), A.number('Height', 100, 1), A.string('Background', '#000000'),
   A.select('Horizontal align', ['Left', 'Center', 'Right'], 'Center'),
   A.select('Vertical align', ['Top', 'Middle', 'Bottom'], 'Middle'),
   A.select('Resizing algorithm', Object.keys(RESIZE_MODES), 'Bilinear'),
   A.boolean('Opaque background', true)],
  async (data, w, h, bg, hAlign, vAlign, alg, opaqueBg) => {
    let bm = contain(await loadBitmap(data), w, h, hAlign, vAlign, alg, 0x00000000);
    if (opaqueBg) {
      const colour = parseBackground(bg);
      const base = { data: new Uint8Array(w * h * 4), width: w, height: h };
      for (let i = 0; i < base.data.length; i += 4) {
        base.data[i] = colour >>> 24; base.data[i + 1] = (colour >>> 16) & 255;
        base.data[i + 2] = (colour >>> 8) & 255; base.data[i + 3] = colour & 255;
      }
      bm = blit(base, bm, 0, 0);
    }
    return bitmapToOutput(bm, data);
  });
