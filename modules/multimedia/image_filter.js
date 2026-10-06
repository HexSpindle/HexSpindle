import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToPng } from './_img.js';
import { greyscale, sepia } from './_jimp.js';

module('Image Filter',
  'Applies a greyscale or sepia filter to an image, using Jimp\'s pixel formulas:' +
  " greyscale uses ITU-R BT.709 luma weights (0.2126/0.7152/" +
  '0.0722), and sepia reproduces Jimp\'s formula exactly, including the fact that it reuses the ' +
  'already-recomputed red channel (rather than the original) when computing the new green and blue ' +
  'channels - a known quirk of that formula, not a textbook sepia matrix. Both store the unrounded ' +
  'result in a byte, i.e. they truncate rather than round, which Jimp also does.',
  [A.select('Filter type', ['Greyscale', 'Sepia'])],
  async (data, filterType) => {
    const bm = await loadBitmap(data);
    return bitmapToPng(filterType === 'Greyscale' ? greyscale(bm) : sepia(bm));
  });
