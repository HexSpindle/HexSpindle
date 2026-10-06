// Ports of jimp 1.6 image primitives (MIT) and the parts of tinycolor2 (MIT) its colour actions use.
export function bitmapFromImageData(img) {
  // Uint8Array, NOT Uint8ClampedArray: jimp stores pixels in a Buffer, so out-of-range writes wrap
  // (and floats truncate) instead of clamping. Matching that is the whole point of this module.
  return { data: new Uint8Array(img.data), width: img.width, height: img.height };
}

export function imageDataFromBitmap(bm) {
  return new ImageData(new Uint8ClampedArray(bm.data), bm.width, bm.height);
}

export function cloneBitmap(bm) {
  return { data: new Uint8Array(bm.data), width: bm.width, height: bm.height };
}

export function scan(bm, cb) {
  for (let y = 0; y < bm.height; y++) {
    for (let x = 0; x < bm.width; x++) cb(x, y, (bm.width * y + x) << 2);
  }
  return bm;
}

const limit255 = n => Math.min(Math.max(n, 0), 255);
// Writing a float into a Buffer/Uint8Array truncates towards zero and wraps modulo 256.
const store = (data, i, v) => { data[i] = v; };

function readUInt32BE(data, i) {
  return ((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3]) >>> 0;
}
function writeUInt32BE(data, v, i) {
  data[i] = (v >>> 24) & 255; data[i + 1] = (v >>> 16) & 255; data[i + 2] = (v >>> 8) & 255; data[i + 3] = v & 255;
}
// jimp's getPixelIndex with the default EXTEND edge handling.
function pixelIndex(bm, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0) x = 0; if (x >= bm.width) x = bm.width - 1;
  if (y < 0) y = 0; if (y >= bm.height) y = bm.height - 1;
  return (bm.width * y + x) << 2;
}

// ---------------------------------------------------------------- @jimp/plugin-color

export function invert(bm) {
  return scan(bm, (x, y, idx) => {
    bm.data[idx] = 255 - bm.data[idx];
    bm.data[idx + 1] = 255 - bm.data[idx + 1];
    bm.data[idx + 2] = 255 - bm.data[idx + 2];
  });
}

export function brightness(bm, val) {
  return scan(bm, (x, y, idx) => {
    bm.data[idx] = limit255(bm.data[idx] * val);
    bm.data[idx + 1] = limit255(bm.data[idx + 1] * val);
    bm.data[idx + 2] = limit255(bm.data[idx + 2] * val);
  });
}

export function contrast(bm, val) {
  const factor = (val + 1) / (1 - val);
  const adjust = (value) => {
    value = Math.floor(factor * (value - 127) + 127);
    return value < 0 ? 0 : value > 255 ? 255 : value;
  };
  return scan(bm, (x, y, idx) => {
    bm.data[idx] = adjust(bm.data[idx]);
    bm.data[idx + 1] = adjust(bm.data[idx + 1]);
    bm.data[idx + 2] = adjust(bm.data[idx + 2]);
  });
}

export function greyscale(bm) {
  // jimp deliberately stores the unrounded luminance, so the byte write truncates it.
  return scan(bm, (x, y, idx) => {
    const grey = 0.2126 * bm.data[idx] + 0.7152 * bm.data[idx + 1] + 0.0722 * bm.data[idx + 2];
    store(bm.data, idx, grey); store(bm.data, idx + 1, grey); store(bm.data, idx + 2, grey);
  });
}

export function sepia(bm) {
  return scan(bm, (x, y, idx) => {
    let red = bm.data[idx], green = bm.data[idx + 1], blue = bm.data[idx + 2];
    red = red * 0.393 + green * 0.769 + blue * 0.189;
    green = red * 0.349 + green * 0.686 + blue * 0.168;
    blue = red * 0.272 + green * 0.534 + blue * 0.131;
    store(bm.data, idx, red < 255 ? red : 255);
    store(bm.data, idx + 1, green < 255 ? green : 255);
    store(bm.data, idx + 2, blue < 255 ? blue : 255);
  });
}

export function opacity(bm, f) {
  return scan(bm, (x, y, idx) => { store(bm.data, idx + 3, bm.data[idx + 3] * f); });
}

function histogram(bm) {
  const h = { r: new Array(256).fill(0), g: new Array(256).fill(0), b: new Array(256).fill(0) };
  scan(bm, (x, y, i) => { h.r[bm.data[i]]++; h.g[bm.data[i + 1]]++; h.b[bm.data[i + 2]]++; });
  return h;
}
const getBounds = ch => [ch.findIndex(v => v > 0), 255 - ch.slice().reverse().findIndex(v => v > 0)];
const normalizeValue = (value, min, max) => ((value - min) * 255) / (max - min);

export function normalize(bm) {
  const h = histogram(bm);
  const bounds = { r: getBounds(h.r), g: getBounds(h.g), b: getBounds(h.b) };
  return scan(bm, (x, y, idx) => {
    store(bm.data, idx, normalizeValue(bm.data[idx], bounds.r[0], bounds.r[1]));
    store(bm.data, idx + 1, normalizeValue(bm.data[idx + 1], bounds.g[0], bounds.g[1]));
    store(bm.data, idx + 2, normalizeValue(bm.data[idx + 2], bounds.b[0], bounds.b[1]));
  });
}

// ---- tinycolor2, as reached through jimp's color() actions -------------------------------------
// Only the paths jimp uses are ported: an {r,g,b} object in, HSL modification, {r,g,b} out.

// tinycolor's bound01: the percentage round-trip really does truncate to 4 decimal places, and that
// shows up in the final byte, so it is reproduced rather than simplified.
function bound01(n, max) {
  const isPercent = typeof n === 'string' && n.indexOf('%') !== -1;
  n = Math.min(max, Math.max(0, parseFloat(n)));
  if (isPercent) n = parseInt(String(n * max), 10) / 100;
  if (Math.abs(n - max) < 0.000001) return 1;
  return (n % max) / max;
}
const clamp01 = v => Math.min(1, Math.max(0, v));
const convertToPercentage = n => (n <= 1 ? `${n * 100}%` : n);

function rgbToHsl(r, g, b) {
  r = bound01(r, 255); g = bound01(g, 255); b = bound01(b, 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s; const l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  h = bound01(h, 360); s = bound01(s, 100); l = bound01(l, 100);
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

// tinycolor(color).toHsl(): the constructor clamps to 0-255 and rounds values below 1.
function toHsl(clr) {
  const fix = v => { v = Math.min(255, Math.max(v, 0)); return v < 1 ? Math.round(v) : v; };
  const hsl = rgbToHsl(fix(clr.r), fix(clr.g), fix(clr.b));
  return { h: hsl.h * 360, s: hsl.s, l: hsl.l };
}
// tinycolor({h,s,l}).toRgb()
function hslToRgbRounded(hsl) {
  const rgb = hslToRgb(hsl.h, convertToPercentage(hsl.s), convertToPercentage(hsl.l));
  const fix = v => { v = Math.min(255, Math.max(v, 0)); return v < 1 ? Math.round(v) : v; };
  return { r: Math.round(fix(rgb.r)), g: Math.round(fix(rgb.g)), b: Math.round(fix(rgb.b)) };
}

function spin(clr, amount) {
  const hsl = toHsl(clr);
  const hue = (hsl.h + amount) % 360;
  hsl.h = hue < 0 ? 360 + hue : hue;
  return hslToRgbRounded(hsl);
}
function saturate(clr, amount) {
  const hsl = toHsl(clr);
  hsl.s = clamp01(hsl.s + (amount === 0 ? 0 : amount || 10) / 100);
  return hslToRgbRounded(hsl);
}
function lighten(clr, amount) {
  const hsl = toHsl(clr);
  hsl.l = clamp01(hsl.l + (amount === 0 ? 0 : amount || 10) / 100);
  return hslToRgbRounded(hsl);
}

export function color(bm, actions) {
  return scan(bm, (x, y, idx) => {
    let clr = { r: bm.data[idx], g: bm.data[idx + 1], b: bm.data[idx + 2] };
    for (const action of actions) {
      const p = action.params || [];
      if (action.apply === 'red') clr.r = limit255(clr.r + p[0]);
      else if (action.apply === 'green') clr.g = limit255(clr.g + p[0]);
      else if (action.apply === 'blue') clr.b = limit255(clr.b + p[0]);
      else if (action.apply === 'hue' || action.apply === 'spin') clr = spin(clr, p[0]);
      else if (action.apply === 'saturate') clr = saturate(clr, p[0]);
      else if (action.apply === 'lighten') clr = lighten(clr, p[0]);
      else throw new Error(`action ${action.apply} not supported`);
    }
    store(bm.data, idx, clr.r); store(bm.data, idx + 1, clr.g); store(bm.data, idx + 2, clr.b);
  });
}

// ---------------------------------------------------------------- @jimp/plugin-dither

export function dither(bm) {
  const rgb565Matrix = [1, 9, 3, 11, 13, 5, 15, 7, 4, 12, 2, 10, 16, 8, 14, 6];
  return scan(bm, (x, y, idx) => {
    const d = rgb565Matrix[((y & 3) << 2) + (x % 4)];
    bm.data[idx] = Math.min(bm.data[idx] + d, 0xff);
    bm.data[idx + 1] = Math.min(bm.data[idx + 1] + d, 0xff);
    bm.data[idx + 2] = Math.min(bm.data[idx + 2] + d, 0xff);
  });
}

// ---------------------------------------------------------------- @jimp/plugin-blur
// "Superfast Blur" (Mario Klingemann), two passes, with jimp's own multiply/shift tables.
const mulTable = [
  1, 57, 41, 21, 203, 34, 97, 73, 227, 91, 149, 62, 105, 45, 39, 137, 241, 107,
  3, 173, 39, 71, 65, 238, 219, 101, 187, 87, 81, 151, 141, 133, 249, 117, 221,
  209, 197, 187, 177, 169, 5, 153, 73, 139, 133, 127, 243, 233, 223, 107, 103,
  99, 191, 23, 177, 171, 165, 159, 77, 149, 9, 139, 135, 131, 253, 245, 119,
  231, 224, 109, 211, 103, 25, 195, 189, 23, 45, 175, 171, 83, 81, 79, 155, 151,
  147, 9, 141, 137, 67, 131, 129, 251, 123, 30, 235, 115, 113, 221, 217, 53, 13,
  51, 50, 49, 193, 189, 185, 91, 179, 175, 43, 169, 83, 163, 5, 79, 155, 19, 75,
  147, 145, 143, 35, 69, 17, 67, 33, 65, 255, 251, 247, 243, 239, 59, 29, 229,
  113, 111, 219, 27, 213, 105, 207, 51, 201, 199, 49, 193, 191, 47, 93, 183, 181,
  179, 11, 87, 43, 85, 167, 165, 163, 161, 159, 157, 155, 77, 19, 75, 37, 73, 145,
  143, 141, 35, 138, 137, 135, 67, 33, 131, 129, 255, 251, 247, 243, 239, 235, 231,
  227, 223, 219, 215, 211, 207, 203, 199, 195, 191, 187, 183, 179, 175, 171, 167,
  163, 159, 155, 151, 147, 143, 139, 135, 131, 127, 123, 119, 115, 111, 107, 103,
  99, 95, 91, 87, 83, 79, 75, 71, 67, 63, 59, 55, 51, 47, 43, 39, 35, 31, 27, 23,
  19, 15, 11, 7, 3,
];
const shgTable = [
  0, 9, 10, 10, 14, 12, 14, 14, 16, 15, 16, 15, 16, 15, 15, 17, 18, 17, 12, 18,
  16, 17, 17, 19, 19, 18, 19, 18, 18, 19, 19, 19, 20, 19, 20, 20, 20, 20, 20, 20,
  15, 20, 19, 20, 20, 20, 21, 21, 21, 20, 20, 20, 21, 18, 21, 21, 21, 21, 20, 21,
  17, 21, 21, 21, 22, 22, 21, 22, 22, 21, 22, 21, 19, 22, 22, 19, 20, 22, 22, 21,
  21, 21, 22, 22, 22, 18, 22, 22, 21, 22, 22, 23, 22, 20, 23, 22, 22, 23, 23, 21,
  19, 21, 21, 21, 23, 23, 23, 22, 23, 23, 21, 23, 22, 23, 18, 22, 23, 20, 22, 23,
  23, 23, 21, 22, 20, 22, 21, 22, 24, 24, 24, 24, 24, 22, 21, 24, 23, 23, 24, 21,
  24, 23, 24, 22, 24, 24, 22, 24, 24, 22, 23, 24, 24, 24, 20, 23, 22, 23, 24, 24,
  24, 24, 24, 24, 24, 23, 21, 23, 22, 23, 24, 24, 24, 22, 24, 24, 24, 23, 22, 24,
  24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25,
  25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25,
  25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24,
  24, 24, 24, 23, 23, 22,
];

export function blur(bm, r) {
  if (typeof r !== 'number') throw new Error('r must be a number');
  if (r < 1) throw new Error('r must be greater than 0');
  let rsum, gsum, bsum, asum, x, y, i, p, p1, p2, yp, yi, yw;
  const wm = bm.width - 1, hm = bm.height - 1;
  const rad1 = r + 1;
  const mulSum = mulTable[r], shgSum = shgTable[r];
  const red = [], green = [], blue = [], alpha = [], vmin = [], vmax = [];
  let iterations = 2;
  while (iterations-- > 0) {
    yi = 0; yw = 0;
    for (y = 0; y < bm.height; y++) {
      rsum = bm.data[yw] * rad1; gsum = bm.data[yw + 1] * rad1;
      bsum = bm.data[yw + 2] * rad1; asum = bm.data[yw + 3] * rad1;
      for (i = 1; i <= r; i++) {
        p = yw + ((i > wm ? wm : i) << 2);
        rsum += bm.data[p++]; gsum += bm.data[p++]; bsum += bm.data[p++]; asum += bm.data[p];
      }
      for (x = 0; x < bm.width; x++) {
        red[yi] = rsum; green[yi] = gsum; blue[yi] = bsum; alpha[yi] = asum;
        if (y === 0) {
          vmin[x] = ((p = x + rad1) < wm ? p : wm) << 2;
          vmax[x] = (p = x - r) > 0 ? p << 2 : 0;
        }
        p1 = yw + vmin[x]; p2 = yw + vmax[x];
        rsum += bm.data[p1++] - bm.data[p2++];
        gsum += bm.data[p1++] - bm.data[p2++];
        bsum += bm.data[p1++] - bm.data[p2++];
        asum += bm.data[p1] - bm.data[p2++];
        yi++;
      }
      yw += bm.width << 2;
    }
    for (x = 0; x < bm.width; x++) {
      yp = x;
      rsum = red[yp] * rad1; gsum = green[yp] * rad1; bsum = blue[yp] * rad1; asum = alpha[yp] * rad1;
      for (i = 1; i <= r; i++) {
        yp += i > hm ? 0 : bm.width;
        rsum += red[yp]; gsum += green[yp]; bsum += blue[yp]; asum += alpha[yp];
      }
      yi = x << 2;
      for (y = 0; y < bm.height; y++) {
        bm.data[yi] = limit255((rsum * mulSum) >>> shgSum);
        bm.data[yi + 1] = limit255((gsum * mulSum) >>> shgSum);
        bm.data[yi + 2] = limit255((bsum * mulSum) >>> shgSum);
        bm.data[yi + 3] = limit255((asum * mulSum) >>> shgSum);
        if (x === 0) {
          vmin[y] = ((p = y + rad1) < hm ? p : hm) * bm.width;
          vmax[y] = (p = y - r) > 0 ? p * bm.width : 0;
        }
        p1 = x + vmin[y]; p2 = x + vmax[y];
        rsum += red[p1] - red[p2]; gsum += green[p1] - green[p2];
        bsum += blue[p1] - blue[p2]; asum += alpha[p1] - alpha[p2];
        yi += bm.width << 2;
      }
    }
  }
  return bm;
}

export function gaussian(bm, r) {
  if (typeof r !== 'number') throw new Error('r must be a number');
  if (r < 1) throw new Error('r must be greater than 0');
  const rs = Math.ceil(r * 2.57);
  const range = rs * 2 + 1;
  const rr2 = r * r * 2, rr2pi = rr2 * Math.PI;
  const weights = [];
  for (let y = 0; y < range; y++) {
    const row = [];
    for (let x = 0; x < range; x++) row[x] = Math.exp(-(((x - rs) ** 2 + (y - rs) ** 2)) / rr2) / rr2pi;
    weights.push(row);
  }
  // NB: jimp writes each pixel inside the inner (iy) loop, so the running sums for later pixels read
  // bytes it has already overwritten. That in-place contamination is part of the output.
  for (let y = 0; y < bm.height; y++) {
    for (let x = 0; x < bm.width; x++) {
      let red = 0, green = 0, blue = 0, alpha = 0, wsum = 0;
      for (let iy = 0; iy < range; iy++) {
        for (let ix = 0; ix < range; ix++) {
          const x1 = Math.min(bm.width - 1, Math.max(0, ix + x - rs));
          const y1 = Math.min(bm.height - 1, Math.max(0, iy + y - rs));
          const weight = weights[iy][ix];
          const idx = (y1 * bm.width + x1) << 2;
          red += bm.data[idx] * weight; green += bm.data[idx + 1] * weight;
          blue += bm.data[idx + 2] * weight; alpha += bm.data[idx + 3] * weight;
          wsum += weight;
        }
        const idx = (y * bm.width + x) << 2;
        bm.data[idx] = Math.round(red / wsum);
        bm.data[idx + 1] = Math.round(green / wsum);
        bm.data[idx + 2] = Math.round(blue / wsum);
        bm.data[idx + 3] = Math.round(alpha / wsum);
      }
    }
  }
  return bm;
}

// ---------------------------------------------------------------- @jimp/plugin-resize (resize2)

const resizeOps = {
  nearestNeighbor(src, dst) {
    const { width: wSrc, height: hSrc, data: bufSrc } = src;
    const { width: wDst, height: hDst, data: bufDst } = dst;
    for (let i = 0; i < hDst; i++) {
      for (let j = 0; j < wDst; j++) {
        let posDst = (i * wDst + j) * 4;
        const iSrc = Math.floor((i * hSrc) / hDst), jSrc = Math.floor((j * wSrc) / wDst);
        let posSrc = (iSrc * wSrc + jSrc) * 4;
        bufDst[posDst++] = bufSrc[posSrc++]; bufDst[posDst++] = bufSrc[posSrc++];
        bufDst[posDst++] = bufSrc[posSrc++]; bufDst[posDst++] = bufSrc[posSrc++];
      }
    }
  },
  bilinearInterpolation(src, dst) {
    const { width: wSrc, height: hSrc, data: bufSrc } = src;
    const { width: wDst, height: hDst, data: bufDst } = dst;
    const interpolate = (k, kMin, vMin, kMax, vMax) =>
      kMin === kMax ? vMin : Math.round((k - kMin) * vMax + (kMax - k) * vMin);
    const assign = (pos, offset, x, xMin, xMax, y, yMin, yMax) => {
      let posMin = (yMin * wSrc + xMin) * 4 + offset;
      let posMax = (yMin * wSrc + xMax) * 4 + offset;
      const vMin = interpolate(x, xMin, bufSrc[posMin], xMax, bufSrc[posMax]);
      if (yMax === yMin) { bufDst[pos + offset] = vMin; return; }
      posMin = (yMax * wSrc + xMin) * 4 + offset;
      posMax = (yMax * wSrc + xMax) * 4 + offset;
      const vMax = interpolate(x, xMin, bufSrc[posMin], xMax, bufSrc[posMax]);
      bufDst[pos + offset] = interpolate(y, yMin, vMin, yMax, vMax);
    };
    for (let i = 0; i < hDst; i++) {
      for (let j = 0; j < wDst; j++) {
        const posDst = (i * wDst + j) * 4;
        const x = (j * wSrc) / wDst, xMin = Math.floor(x), xMax = Math.min(Math.ceil(x), wSrc - 1);
        const y = (i * hSrc) / hDst, yMin = Math.floor(y), yMax = Math.min(Math.ceil(y), hSrc - 1);
        assign(posDst, 0, x, xMin, xMax, y, yMin, yMax);
        assign(posDst, 1, x, xMin, xMax, y, yMin, yMax);
        assign(posDst, 2, x, xMin, xMax, y, yMin, yMax);
        assign(posDst, 3, x, xMin, xMax, y, yMin, yMax);
      }
    }
  },
  _interpolate2D(src, dst, interpolate) {
    const { width: wSrc, height: hSrc, data: bufSrc } = src;
    const { width: wDst, height: hDst } = dst;
    const bufDst = dst.data;
    const wM = Math.max(1, Math.floor(wSrc / wDst)), wDst2 = wDst * wM;
    const hM = Math.max(1, Math.floor(hSrc / hDst)), hDst2 = hDst * hM;
    const buf1 = new Uint8Array(wDst2 * hSrc * 4);
    for (let i = 0; i < hSrc; i++) {
      for (let j = 0; j < wDst2; j++) {
        const x = (j * (wSrc - 1)) / wDst2, xPos = Math.floor(x), t = x - xPos;
        const srcPos = (i * wSrc + xPos) * 4, buf1Pos = (i * wDst2 + j) * 4;
        for (let k = 0; k < 4; k++) {
          const kPos = srcPos + k;
          const x0 = xPos > 0 ? bufSrc[kPos - 4] : 2 * bufSrc[kPos] - bufSrc[kPos + 4];
          const x1 = bufSrc[kPos];
          const x2 = bufSrc[kPos + 4];
          const x3 = xPos < wSrc - 2 ? bufSrc[kPos + 8] : 2 * bufSrc[kPos + 4] - bufSrc[kPos];
          buf1[buf1Pos + k] = interpolate(x0, x1, x2, x3, t);
        }
      }
    }
    const buf2 = new Uint8Array(wDst2 * hDst2 * 4);
    for (let i = 0; i < hDst2; i++) {
      for (let j = 0; j < wDst2; j++) {
        const y = (i * (hSrc - 1)) / hDst2, yPos = Math.floor(y), t = y - yPos;
        const buf1Pos = (yPos * wDst2 + j) * 4, buf2Pos = (i * wDst2 + j) * 4;
        for (let k = 0; k < 4; k++) {
          const kPos = buf1Pos + k;
          const y0 = yPos > 0 ? buf1[kPos - wDst2 * 4] : 2 * buf1[kPos] - buf1[kPos + wDst2 * 4];
          const y1 = buf1[kPos];
          const y2 = buf1[kPos + wDst2 * 4];
          const y3 = yPos < hSrc - 2 ? buf1[kPos + wDst2 * 8] : 2 * buf1[kPos + wDst2 * 4] - buf1[kPos];
          buf2[buf2Pos + k] = interpolate(y0, y1, y2, y3, t);
        }
      }
    }
    const m = wM * hM;
    if (m > 1) {
      for (let i = 0; i < hDst; i++) {
        for (let j = 0; j < wDst; j++) {
          let r = 0, g = 0, b = 0, a = 0, realColors = 0;
          for (let y = 0; y < hM; y++) {
            const yPos = i * hM + y;
            for (let x = 0; x < wM; x++) {
              const xyPos = (yPos * wDst2 + (j * wM + x)) * 4;
              const pixelAlpha = buf2[xyPos + 3];
              if (pixelAlpha) { r += buf2[xyPos]; g += buf2[xyPos + 1]; b += buf2[xyPos + 2]; realColors++; }
              a += pixelAlpha;
            }
          }
          const pos = (i * wDst + j) * 4;
          bufDst[pos] = realColors ? Math.round(r / realColors) : 0;
          bufDst[pos + 1] = realColors ? Math.round(g / realColors) : 0;
          bufDst[pos + 2] = realColors ? Math.round(b / realColors) : 0;
          bufDst[pos + 3] = Math.round(a / m);
        }
      }
    } else {
      dst.data = buf2;
    }
  },
  bicubicInterpolation(src, dst) {
    return resizeOps._interpolate2D(src, dst, (x0, x1, x2, x3, t) => {
      const a0 = x3 - x2 - x0 + x1, a1 = x0 - x1 - a0, a2 = x2 - x0, a3 = x1;
      return Math.max(0, Math.min(255, a0 * (t * t * t) + a1 * (t * t) + a2 * t + a3));
    });
  },
  hermiteInterpolation(src, dst) {
    return resizeOps._interpolate2D(src, dst, (x0, x1, x2, x3, t) => {
      const c0 = x1, c1 = 0.5 * (x2 - x0);
      const c2 = x0 - 2.5 * x1 + 2 * x2 - 0.5 * x3;
      const c3 = 0.5 * (x3 - x0) + 1.5 * (x1 - x2);
      return Math.max(0, Math.min(255, Math.round(((c3 * t + c2) * t + c1) * t + c0)));
    });
  },
  bezierInterpolation(src, dst) {
    return resizeOps._interpolate2D(src, dst, (x0, x1, x2, x3, t) => {
      const cp1 = x1 + (x2 - x0) / 4, cp2 = x2 - (x3 - x1) / 4, nt = 1 - t;
      return Math.max(0, Math.min(255,
        Math.round(x1 * nt * nt * nt + 3 * cp1 * nt * nt * t + 3 * cp2 * nt * t * t + x2 * t * t * t)));
    });
  },
};

export const RESIZE_MODES = {
  'Nearest Neighbour': 'nearestNeighbor',
  Bilinear: 'bilinearInterpolation',
  Bicubic: 'bicubicInterpolation',
  Hermite: 'hermiteInterpolation',
  Bezier: 'bezierInterpolation',
};

export function resize(bm, w, h, mode) {
  w = Math.round(w) || 1;
  h = Math.round(h) || 1;
  const op = resizeOps[RESIZE_MODES[mode] || mode];
  if (!op) throw new Error(`Unknown resizing algorithm '${mode}'`);
  const dst = { data: new Uint8Array(w * h * 4), width: w, height: h };
  op(bm, dst);
  bm.data = dst.data; bm.width = dst.width; bm.height = dst.height;
  return bm;
}
export function scale(bm, f, mode) {
  return resize(bm, bm.width * f, bm.height * f, mode);
}
export function scaleToFit(bm, w, h, mode) {
  const f = w / h > bm.width / bm.height ? h / bm.height : w / bm.width;
  return scale(bm, f, mode);
}

// ---------------------------------------------------------------- @jimp/plugin-crop

export function crop(bm, x, y, w, h) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  // jimp reads the source with readUInt32BE, which throws on any pixel outside the bitmap.
  if (x < 0 || y < 0 || w < 0 || h < 0 || ((y + h - 1) * bm.width + (x + w - 1)) * 4 + 4 > bm.data.length) {
    throw new Error('Error cropping image. (the crop rectangle lies outside the image)');
  }
  const out = new Uint8Array(w * h * 4);
  let offset = 0;
  for (let _y = y; _y < y + h; _y++) {
    for (let _x = x; _x < x + w; _x++) {
      const idx = (bm.width * _y + _x) << 2;
      writeUInt32BE(out, readUInt32BE(bm.data, idx), offset);
      offset += 4;
    }
  }
  bm.data = out; bm.width = w; bm.height = h;
  return bm;
}

function colorDiff(rgba1, rgba2) {
  const sq = n => n ** 2;
  const { max } = Math;
  const maxVal = 255 * 255 * 3;
  const a1 = rgba1.a, a2 = rgba2.a;
  return (max(sq(rgba1.r - rgba2.r), sq(rgba1.r - rgba2.r - a1 + a2)) +
    max(sq(rgba1.g - rgba2.g), sq(rgba1.g - rgba2.g - a1 + a2)) +
    max(sq(rgba1.b - rgba2.b), sq(rgba1.b - rgba2.b - a1 + a2))) / maxVal;
}
// getPixelColor() returns 0 outside the bitmap, which intToRGBA turns into a transparent black.
function pixelColor(bm, x, y) {
  if (x < 0 || y < 0 || x >= bm.width || y >= bm.height) return { r: 0, g: 0, b: 0, a: 0 };
  const i = (bm.width * y + x) << 2;
  return { r: bm.data[i], g: bm.data[i + 1], b: bm.data[i + 2], a: bm.data[i + 3] };
}

export function autocrop(bm, { tolerance = 0.0002, cropOnlyFrames = true, cropSymmetric = false, leaveBorder = 0 } = {}) {
  const w = bm.width, h = bm.height;
  const minPixelsPerSide = 1;
  const px = (x, y) => pixelColor(bm, x, y);
  const rgba1 = px(0, 0);
  let north = 0, east = 0, south = 0, west = 0;
  northScan: for (let y = 0; y < h - minPixelsPerSide; y++) {
    for (let x = 0; x < w; x++) if (colorDiff(rgba1, px(x, y)) > tolerance) break northScan;
    north++;
  }
  westScan: for (let x = 0; x < w - minPixelsPerSide; x++) {
    for (let y = 0 + north; y < h; y++) if (colorDiff(rgba1, px(x, y)) > tolerance) break westScan;
    west++;
  }
  southScan: for (let y = h - 1; y >= north + minPixelsPerSide; y--) {
    for (let x = w - east - 1; x >= 0; x--) if (colorDiff(rgba1, px(x, y)) > tolerance) break southScan;
    south++;
  }
  eastScan: for (let x = w - 1; x >= 0 + west + minPixelsPerSide; x--) {
    for (let y = h - 1; y >= 0 + north; y--) if (colorDiff(rgba1, px(x, y)) > tolerance) break eastScan;
    east++;
  }
  west -= leaveBorder; east -= leaveBorder; north -= leaveBorder; south -= leaveBorder;
  if (cropSymmetric) {
    const horizontal = Math.min(east, west), vertical = Math.min(north, south);
    west = east = horizontal; north = south = vertical;
  }
  west = west >= 0 ? west : 0; east = east >= 0 ? east : 0;
  north = north >= 0 ? north : 0; south = south >= 0 ? south : 0;
  const doCrop = cropOnlyFrames
    ? east !== 0 && north !== 0 && west !== 0 && south !== 0
    : east !== 0 || north !== 0 || west !== 0 || south !== 0;
  if (doCrop) crop(bm, west, north, w - (west + east), h - (south + north));
  return bm;
}

// ---------------------------------------------------------------- @jimp/plugin-blit

export function blit(dst, src, x = 0, y = 0) {
  x = Math.round(x); y = Math.round(y);
  for (let sy = 0; sy < src.height; sy++) {
    for (let sx = 0; sx < src.width; sx++) {
      const idx = (src.width * sy + sx) << 2;
      const xOffset = x + sx, yOffset = y + sy;
      if (xOffset >= 0 && yOffset >= 0 && dst.width - xOffset > 0 && dst.height - yOffset > 0) {
        const dstIdx = pixelIndex(dst, xOffset, yOffset);
        const sr = src.data[idx] || 0, sg = src.data[idx + 1] || 0, sb = src.data[idx + 2] || 0, sa = src.data[idx + 3] || 0;
        const dr = dst.data[dstIdx] || 0, dg = dst.data[dstIdx + 1] || 0, db = dst.data[dstIdx + 2] || 0, da = dst.data[dstIdx + 3] || 0;
        dst.data[dstIdx] = ((sa * (sr - dr) - dr + 255) >> 8) + dr;
        dst.data[dstIdx + 1] = ((sa * (sg - dg) - dg + 255) >> 8) + dg;
        dst.data[dstIdx + 2] = ((sa * (sb - db) - db + 255) >> 8) + db;
        dst.data[dstIdx + 3] = limit255(da + sa);
      }
    }
  }
  return dst;
}

// ---------------------------------------------------------------- @jimp/plugin-flip

export function flip(bm, horizontal, vertical) {
  const out = new Uint8Array(bm.data.length);
  scan(bm, (x, y, idx) => {
    const _x = horizontal ? bm.width - 1 - x : x;
    const _y = vertical ? bm.height - 1 - y : y;
    writeUInt32BE(out, readUInt32BE(bm.data, idx), (bm.width * _y + _x) << 2);
  });
  bm.data = out;
  return bm;
}

// ---------------------------------------------------------------- contain / cover

// jimp's alignment flags collapse to a 0/1/2 multiplier per axis.
const ALIGN = { Left: 0, Center: 1, Right: 2, Top: 0, Middle: 1, Bottom: 2 };

export function contain(bm, w, h, hAlign, vAlign, mode, background = 0x00000000) {
  const alignH = ALIGN[hAlign] ?? 1, alignV = ALIGN[vAlign] ?? 1;
  const f = w / h > bm.width / bm.height ? h / bm.height : w / bm.width;
  const c = scale(cloneBitmap(bm), f, mode);
  resize(bm, w, h, mode);
  scan(bm, (x, y, idx) => writeUInt32BE(bm.data, background, idx));
  return blit(bm, c, ((bm.width - c.width) / 2) * alignH, ((bm.height - c.height) / 2) * alignV);
}

export function cover(bm, w, h, hAlign, vAlign, mode) {
  const alignH = ALIGN[hAlign] ?? 1, alignV = ALIGN[vAlign] ?? 1;
  const f = w / h > bm.width / bm.height ? w / bm.width : h / bm.height;
  scale(bm, f, mode);
  return crop(bm, ((bm.width - w) / 2) * alignH, ((bm.height - h) / 2) * alignV, w, h);
}

// ---------------------------------------------------------------- @jimp/plugin-rotate

// jimp's matrixRotate: exact, loss-free, used for every multiple of 90 degrees.
export function matrixRotate(bm, deg) {
  const w = bm.width, h = bm.height;
  let angle;
  switch (deg) {
    case 90: case -270: angle = 90; break;
    case 180: case -180: angle = 180; break;
    case 270: case -90: angle = -90; break;
    default: throw new Error('Unsupported matrix rotation degree');
  }
  const nW = angle === 180 ? w : h, nH = angle === 180 ? h : w;
  const out = new Uint8Array(bm.data.length);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const srcIdx = ((y * w + x) << 2);
      const pixel = readUInt32BE(bm.data, srcIdx);
      let dx, dy;
      if (angle === 90) { dx = y; dy = w - x - 1; }
      else if (angle === -90) { dx = h - y - 1; dy = x; }
      else { dx = w - x - 1; dy = h - y - 1; }
      writeUInt32BE(out, pixel, (dy * nW + dx) << 2);
    }
  }
  bm.data = out; bm.width = nW; bm.height = nH;
  return bm;
}

// jimp's advancedRotate for angles that are not a multiple of 90: the source image is grown to a
// square (nearest-neighbour sampling, no interpolation), rotated by sampling, then cropped back.
export function advancedRotate(bm, deg, background = 0x00000000) {
  const rad = (deg * Math.PI) / 180;
  const cosine = Math.cos(rad), sine = Math.sin(rad);
  let w = Math.ceil(Math.abs(bm.width * cosine) + Math.abs(bm.height * sine)) + 1;
  let h = Math.ceil(Math.abs(bm.width * sine) + Math.abs(bm.height * cosine)) + 1;
  if (w % 2 !== 0) w++;
  if (h % 2 !== 0) h++;
  const c = cloneBitmap(bm);
  scan(bm, (x, y, idx) => writeUInt32BE(bm.data, background, idx));
  const max = Math.max(w, h, bm.width, bm.height);
  resize(bm, max, max, 'bilinearInterpolation');
  // jimp composites with the default SRC_OVER blend; for a fully transparent destination that is
  // just the source, which is what blit does for opaque sources too.
  blit(bm, c, bm.width / 2 - c.width / 2, bm.height / 2 - c.height / 2);
  const bW = bm.width, bH = bm.height;
  const out = new Uint8Array(bm.data.length);
  for (let y = 1; y <= bH; y++) {
    for (let x = 1; x <= bW; x++) {
      const cx = x - bW / 2, cy = y - bH / 2;
      const sx = cosine * cx - sine * cy + bW / 2 + 0.5;
      const sy = cosine * cy + sine * cx + bH / 2 + 0.5;
      const dstIdx = (bW * (y - 1) + x - 1) << 2;
      if (sx >= 0 && sx < bW && sy >= 0 && sy < bH) {
        writeUInt32BE(out, readUInt32BE(bm.data, ((bW * (sy | 0) + sx) | 0) << 2), dstIdx);
      } else {
        writeUInt32BE(out, background, dstIdx);
      }
    }
  }
  bm.data = out;
  return crop(bm, Math.max(bW / 2 - w / 2, 0), Math.max(bH / 2 - h / 2, 0), w, h);
}

export function rotate(bm, deg) {
  deg %= 360;
  if (deg % 360 === 0) return bm;
  if (deg % 90 === 0) return matrixRotate(bm, deg);
  return advancedRotate(bm, deg);
}
