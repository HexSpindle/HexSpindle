import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap } from './_img.js';
import { normalize } from './_jimp.js';
import { decodeQrFromPixels } from './_qr_decode.js';

module('Parse QR Code', 'Reads an image and decodes a QR code from it back to the original text (the reverse of Generate QR Code): locates the three finder patterns, derives the module grid from their spacing, undoes the data mask, corrects errors with Reed-Solomon, then decodes the data codewords. Works on upright or rotated/scaled images; does not correct for perspective (keystone) distortion from an angled photo. Clean, undamaged QR codes decode most reliably.',
  [A.boolean('Normalise image', false)],
  async (data, normalise) => {
    let bm;
    try {
      bm = await loadBitmap(data);
    } catch (err) {
      throw new Error('Invalid file type.');
    }
    if (normalise) bm = normalize(bm);
    // Transparent pixels become white and everything else opaque, as QR readers expect.
    const px = new Uint8ClampedArray(bm.data);
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) { px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; }
      px[i + 3] = 255;
    }
    try {
      return decodeQrFromPixels(px, bm.width, bm.height);
    } catch (err) {
      throw new Error('Could not read a QR code from the image.');
    }
  });
