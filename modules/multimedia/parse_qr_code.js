import { module } from './_cat.js';
import { loadImage } from './_img.js';
import { decodeQrFromPixels } from './_qr_decode.js';

module('Parse QR Code', 'Reads an image and decodes a QR code from it back to the original text (the reverse of Generate QR Code): locates the three finder patterns, derives the module grid from their spacing, undoes the data mask, corrects errors with Reed-Solomon, then decodes the data codewords. Works on upright or rotated/scaled images; does not correct for perspective (keystone) distortion from an angled photo. Clean, undamaged QR codes decode most reliably.',
  [],
  async (data) => {
    const { ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    try {
      return decodeQrFromPixels(img.data, width, height);
    } catch (err) {
      throw new Error(`Could not read a QR code from the image. (${err.message})`);
    }
  });
