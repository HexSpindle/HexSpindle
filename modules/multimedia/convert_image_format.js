import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToFormat } from './_img.js';
import { encodeBmp, encodeIco, encodeTiff, encodeGif } from './_encoders.js';

module('Convert Image Format', 'Converts an image between PNG, JPEG, GIF, BMP, WebP, TIFF and ICO.',
  [A.select('Output format', ['PNG', 'JPEG', 'GIF', 'BMP', 'WEBP', 'TIFF', 'ICO']), A.number('JPEG/WebP quality', 90, 1, 100)],
  async (data, fmt, quality) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    if (fmt === 'PNG') return canvasToFormat(canvas, 'image/png');
    if (fmt === 'JPEG') return canvasToFormat(canvas, 'image/jpeg', quality / 100);
    if (fmt === 'WEBP') return canvasToFormat(canvas, 'image/webp', quality / 100);
    const img = ctx.getImageData(0, 0, width, height);
    if (fmt === 'BMP') return encodeBmp(img, width, height);
    if (fmt === 'TIFF') return encodeTiff(img, width, height);
    if (fmt === 'GIF') return encodeGif(img, width, height);
    const png = await canvasToFormat(canvas, 'image/png');
    return encodeIco(png, width, height);
  });
