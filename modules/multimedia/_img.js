import { bitmapFromImageData } from './_jimp.js';
import { encodePng } from './_encoders.js';
import { decodePng } from './_png_decode.js';

export async function loadImage(data) {
  const blob = new Blob([data]);
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  return { canvas, ctx, width: bitmap.width, height: bitmap.height };
}
export async function canvasToPng(canvas) {
  return canvasToFormat(canvas, 'image/png');
}
export async function canvasToFormat(canvas, type, quality) {
  const blob = await canvas.convertToBlob(quality === undefined ? { type } : { type, quality });
  return new Uint8Array(await blob.arrayBuffer());
}

function convolveSeparable(img, width, height, kernel) {
  const radius = (kernel.length - 1) / 2;
  const src = img.data;
  const tmp = new Float32Array(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(width - 1, Math.max(0, x + k));
        const i = (y * width + sx) * 4;
        const w = kernel[k + radius];
        r += src[i] * w; g += src[i + 1] * w; b += src[i + 2] * w;
      }
      const o = (y * width + x) * 4;
      tmp[o] = r; tmp[o + 1] = g; tmp[o + 2] = b; tmp[o + 3] = src[o + 3];
    }
  }
  const out = new Uint8ClampedArray(src.length);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let r = 0, g = 0, b = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(height - 1, Math.max(0, y + k));
        const i = (sy * width + x) * 4;
        const w = kernel[k + radius];
        r += tmp[i] * w; g += tmp[i + 1] * w; b += tmp[i + 2] * w;
      }
      const o = (y * width + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = tmp[o + 3];
    }
  }
  return new ImageData(out, width, height);
}

export function boxBlur(img, width, height, radius) {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) return img;
  const kernel = new Array(r * 2 + 1).fill(1 / (r * 2 + 1));
  return convolveSeparable(img, width, height, kernel);
}

export function gaussianBlur(img, width, height, sigma) {
  if (sigma <= 0) return img;
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Array(radius * 2 + 1);
  let sum = 0;
  for (let k = -radius; k <= radius; k++) { const v = Math.exp(-(k * k) / (2 * sigma * sigma)); kernel[k + radius] = v; sum += v; }
  for (let k = 0; k < kernel.length; k++) kernel[k] /= sum;
  return convolveSeparable(img, width, height, kernel);
}

export async function loadBitmap(data) {
  // PNG is decoded directly (see _png_decode.js): a canvas would round-trip the pixels through
  // premultiplied alpha and change every pixel that isn't fully opaque.
  const png = await decodePng(data);
  if (png) return png;
  const { ctx, width, height } = await loadImage(data);
  return bitmapFromImageData(ctx.getImageData(0, 0, width, height));
}

export async function bitmapToPng(bm) {
  return encodePng(bm);
}

function imageKind(b) {
  if (b.length > 2 && b[0] === 0x42 && b[1] === 0x4d) return 'bmp';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length > 4 && ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a))) return 'tiff';
  return 'png';
}

/** Encodes the result in the same format as the input image (BMP, JPEG or TIFF stay as they are;
 *  PNG, GIF and anything else become PNG). */
export async function bitmapToOutput(bm, input) {
  const src = input instanceof Uint8Array ? input : new Uint8Array(input);
  const kind = imageKind(src);
  if (kind === 'png') return encodePng(bm);
  const codecs = await import('./_img_codecs.mjs');
  if (kind === 'bmp') return codecs.encodeBmpLike({}, bm.data, bm.width, bm.height);
  if (kind === 'jpeg') return codecs.encodeJpeg(bm.data, bm.width, bm.height);
  return codecs.encodeTiff(bm.data, bm.width, bm.height);
}
