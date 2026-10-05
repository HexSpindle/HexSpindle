import { loadImage } from './_img.js';

async function toGrayArray(data, width, height = width) {
  const { canvas: src } = typeof data === 'object' && data && data.canvas ? data : await loadImage(data);
  const small = new OffscreenCanvas(width, height);
  const ctx = small.getContext('2d');
  ctx.drawImage(src, 0, 0, width, height);
  const img = ctx.getImageData(0, 0, width, height);
  const out = [];
  for (let y = 0; y < height; y++) {
    const row = new Float64Array(width);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row[x] = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    }
    out.push(row);
  }
  return out;
}

function bitsToHex(bits) {
  let n = 0n;
  for (const b of bits) n = (n << 1n) | BigInt(b ? 1 : 0);
  const hexLen = Math.ceil(bits.length / 4);
  return n.toString(16).padStart(hexLen, '0');
}

export async function ahash(data, size = 8) {
  const a = await toGrayArray(data, size);
  let sum = 0;
  for (const row of a) for (const v of row) sum += v;
  const mean = sum / (size * size);
  const bits = [];
  for (const row of a) for (const v of row) bits.push(v > mean ? 1 : 0);
  return bitsToHex(bits);
}

export async function dhash(data, size = 8) {
  const a = await toGrayArray(data, size + 1, size);
  const bits = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) bits.push(a[y][x + 1] > a[y][x] ? 1 : 0);
  return bitsToHex(bits);
}

function dct1d(x) {
  const n = x.length;
  const out = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += x[i] * Math.cos((Math.PI / n) * (i + 0.5) * k);
    out[k] = sum * 2 * (k === 0 ? Math.sqrt(1 / (4 * n)) : Math.sqrt(1 / (2 * n)));
  }
  return out;
}

function dct2d(matrix) {
  const h = matrix.length, w = matrix[0].length;
  const cols = [];
  for (let x = 0; x < w; x++) cols.push(dct1d(matrix.map(row => row[x])));
  const afterCols = Array.from({ length: h }, (_, y) => cols.map(c => c[y]));
  return afterCols.map(row => Array.from(dct1d(row)));
}

export async function phash(data, size = 32, keep = 8) {
  const a = await toGrayArray(data, size);
  const d = dct2d(a);
  const low = [];
  for (let y = 0; y < keep; y++) low.push(d[y].slice(0, keep));
  const values = low.flat();
  const sorted = [...values].sort((x, y) => x - y);
  const mid = sorted.length / 2;
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[mid - 1] + sorted[mid]) / 2;
  const bits = values.map(v => v > median ? 1 : 0);
  return bitsToHex(bits);
}

function haarLL(a) {
  const h = a.length, w = a[0].length;
  const rows = a.map(row => {
    const out = new Float64Array(w / 2);
    for (let x = 0; x < w / 2; x++) out[x] = (row[2 * x] + row[2 * x + 1]) / Math.SQRT2;
    return out;
  });
  const out = [];
  for (let y = 0; y < h / 2; y++) {
    const row = new Float64Array(w / 2);
    for (let x = 0; x < w / 2; x++) row[x] = (rows[2 * y][x] + rows[2 * y + 1][x]) / Math.SQRT2;
    out.push(row);
  }
  return out;
}

export async function whash(data, size = 8) {
  const loaded = await loadImage(data);
  const minSide = Math.min(loaded.canvas.width, loaded.canvas.height);
  const scale = Math.max(2 ** Math.floor(Math.log2(minSide)), size);
  let a = await toGrayArray(loaded, scale);
  a = a.map(row => Array.from(row, v => v / 255));
  while (a.length > size && a.length % 2 === 0) a = haarLL(a);
  const values = a.flatMap(row => Array.from(row));
  const sorted = [...values].sort((x, y) => x - y);
  const mid = sorted.length / 2;
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[mid - 1] + sorted[mid]) / 2;
  const bits = values.map(v => v > median ? 1 : 0);
  return bitsToHex(bits);
}

export function hammingHex(a, b) {
  if (a.length !== b.length) throw new Error('Hashes must be the same length to compare');
  const x = BigInt('0x' + a) ^ BigInt('0x' + b);
  return x.toString(2).replace(/0/g, '').length;
}
