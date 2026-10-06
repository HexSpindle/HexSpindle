// Minimal PNG decoder.
import { streamTransform } from '../compression/_streams.js';

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

export async function decodePng(data) {
  if (data.length < 8 || !SIG.every((v, i) => data[i] === v)) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let off = 8;
  let width = 0, height = 0, depth = 0, colourType = 0, interlace = 0;
  let palette = null, trns = null;
  const idat = [];
  while (off + 8 <= data.length) {
    const len = view.getUint32(off);
    const type = String.fromCharCode(data[off + 4], data[off + 5], data[off + 6], data[off + 7]);
    const body = data.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = view.getUint32(off + 8); height = view.getUint32(off + 12);
      depth = body[8]; colourType = body[9]; interlace = body[12];
    } else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') trns = body;
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8 || interlace !== 0 || !CHANNELS[colourType] || !width || !height) return null;
  if (colourType === 3 && !palette) return null;

  const total = idat.reduce((n, c) => n + c.length, 0);
  const z = new Uint8Array(total);
  let p = 0;
  for (const c of idat) { z.set(c, p); p += c.length; }
  let raw;
  try { raw = await streamTransform(z, 'deflate', 'decompress'); } catch { return null; }

  const ch = CHANNELS[colourType];
  const stride = width * ch;
  if (raw.length < (stride + 1) * height) return null;
  const lines = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = lines.subarray(y * stride, (y + 1) * stride);
    const prev = y ? lines.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= ch ? prev[i - ch] : 0;
      const x = src[i];
      if (filter === 0) cur[i] = x;
      else if (filter === 1) cur[i] = (x + a) & 255;
      else if (filter === 2) cur[i] = (x + b) & 255;
      else if (filter === 3) cur[i] = (x + ((a + b) >> 1)) & 255;
      else if (filter === 4) cur[i] = (x + paeth(a, b, c)) & 255;
      else return null;
    }
  }

  const out = new Uint8Array(width * height * 4);
  for (let i = 0, o = 0; o < out.length; i += ch, o += 4) {
    if (colourType === 0) { out[o] = out[o + 1] = out[o + 2] = lines[i]; out[o + 3] = 255; }
    else if (colourType === 4) { out[o] = out[o + 1] = out[o + 2] = lines[i]; out[o + 3] = lines[i + 1]; }
    else if (colourType === 2) { out[o] = lines[i]; out[o + 1] = lines[i + 1]; out[o + 2] = lines[i + 2]; out[o + 3] = 255; }
    else if (colourType === 6) { out[o] = lines[i]; out[o + 1] = lines[i + 1]; out[o + 2] = lines[i + 2]; out[o + 3] = lines[i + 3]; }
    else {
      const idx = lines[i] * 3;
      if (idx + 2 >= palette.length) return null;
      out[o] = palette[idx]; out[o + 1] = palette[idx + 1]; out[o + 2] = palette[idx + 2];
      out[o + 3] = trns && lines[i] < trns.length ? trns[lines[i]] : 255;
    }
  }
  // greyscale/truecolour tRNS (a single transparent value) is rare; leave it to the canvas.
  if (trns && colourType !== 3) return null;
  return { data: out, width, height };
}
