import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToFormat, loadBitmap } from './_img.js';
import { encodeBmp, encodeIco, encodeTiff, encodeGif, encodePng } from './_encoders.js';

module('Convert Image Format', 'Converts an image between PNG, JPEG, GIF, BMP, WebP, TIFF and ICO.',
  [A.select('Output format', ['PNG', 'JPEG', 'GIF', 'BMP', 'WEBP', 'TIFF', 'ICO']), A.number('JPEG/WebP quality', 90, 1, 100)],
  async (data, fmt, quality) => {
    // PNG and the raw formats go through the bitmap path so the pixels survive untouched; JPEG and
    // WebP are lossy anyway and need the platform encoder.
    if (fmt === 'JPEG' || fmt === 'WEBP') {
      const { canvas } = await loadImage(data);
      return canvasToFormat(canvas, fmt === 'JPEG' ? 'image/jpeg' : 'image/webp', quality / 100);
    }
    const img = await loadBitmap(data);
    const { width, height } = img;
    if (fmt === 'PNG') return encodePng(img);
    if (fmt === 'BMP') return encodeBmp(img, width, height);
    if (fmt === 'TIFF') return encodeTiff(img, width, height);
    if (fmt === 'GIF') return encodeGif(img, width, height);
    return encodeIco(await encodePng(img), width, height);
  });
