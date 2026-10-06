import { streamTransform } from '../compression/_streams.js';

export function encodeBmp(imgData, width, height) {
  const rowSize = Math.ceil((width * 3) / 4) * 4; // rows are padded to a 4-byte boundary
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  view.setUint8(0, 0x42); view.setUint8(1, 0x4d); // "BM"
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true); // pixel data offset
  view.setUint32(14, 40, true); // DIB header size
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive height = bottom-up rows
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(30, 0, true); // no compression
  view.setUint32(34, pixelDataSize, true);
  const bytes = new Uint8Array(buf);
  const src = imgData.data;
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // BMP stores rows bottom-up
    let o = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const i = (srcY * width + x) * 4;
      bytes[o++] = src[i + 2]; bytes[o++] = src[i + 1]; bytes[o++] = src[i]; // BGR
    }
  }
  return bytes;
}

export function encodeIco(pngBytes, width, height) {
  const header = new Uint8Array(6 + 16);
  const view = new DataView(header.buffer);
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, 1, true); // 1 image
  header[6] = width >= 256 ? 0 : width;
  header[7] = height >= 256 ? 0 : height;
  view.setUint16(10, 1, true); // colour planes
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, pngBytes.length, true);
  view.setUint32(18, 22, true); // offset of image data
  const out = new Uint8Array(22 + pngBytes.length);
  out.set(header, 0);
  out.set(pngBytes, 22);
  return out;
}

export function encodeTiff(imgData, width, height) {
  const pixelBytes = width * height * 4;
  const entries = [
    [256, 3, 1, width], [257, 3, 1, height], [258, 3, 4, 8], // bits per sample (per-component, offset below)
    [259, 3, 1, 1], [262, 3, 1, 2], [273, 4, 1, 0], [277, 3, 1, 4],
    [278, 3, 1, height], [279, 4, 1, pixelBytes], [338, 3, 1, 2],
  ];
  const numEntries = entries.length;
  const ifdOffset = 8;
  const ifdSize = 2 + numEntries * 12 + 4;
  const bitsPerSampleOffset = ifdOffset + ifdSize;
  const stripOffset = bitsPerSampleOffset + 8; // 4 x uint16
  const total = stripOffset + pixelBytes;
  const buf = new ArrayBuffer(total);
  const view = new DataView(buf);
  view.setUint16(0, 0x4949, true); // "II" little-endian
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);
  view.setUint16(ifdOffset, numEntries, true);
  let off = ifdOffset + 2;
  for (const [tag, type, count, value] of entries) {
    view.setUint16(off, tag, true);
    view.setUint16(off + 2, type, true);
    view.setUint32(off + 4, count, true);
    if (tag === 258) view.setUint32(off + 8, bitsPerSampleOffset, true);
    else if (tag === 273) view.setUint32(off + 8, stripOffset, true);
    else view.setUint32(off + 8, value, true);
    off += 12;
  }
  view.setUint32(off, 0, true); // no more IFDs
  for (let i = 0; i < 4; i++) view.setUint16(bitsPerSampleOffset + i * 2, 8, true);
  new Uint8Array(buf, stripOffset, pixelBytes).set(imgData.data);
  return new Uint8Array(buf);
}


function medianCutPalette(data, maxColors) {
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) pixels.push([data[i], data[i + 1], data[i + 2]]);
  let buckets = [pixels];
  while (buckets.length < maxColors) {
    let worst = -1, worstRange = -1, worstChan = 0;
    buckets.forEach((bucket, bi) => {
      if (bucket.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of bucket) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
        if (hi - lo > worstRange) { worstRange = hi - lo; worst = bi; worstChan = c; }
      }
    });
    if (worst === -1) break;
    const bucket = buckets[worst];
    bucket.sort((a, b) => a[worstChan] - b[worstChan]);
    const mid = Math.floor(bucket.length / 2);
    buckets.splice(worst, 1, bucket.slice(0, mid), bucket.slice(mid));
  }
  return buckets.filter(b => b.length).map(bucket => {
    const sum = [0, 0, 0];
    for (const p of bucket) { sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; }
    return sum.map(v => Math.round(v / bucket.length));
  });
}

function nearestPaletteIndex(palette, r, g, b) {
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb] = palette[i];
    const d = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize, endCode = clearCode + 1;
  let codeSize = minCodeSize + 1, nextCode = endCode + 1;
  let dict = new Map();
  const resetDict = () => { dict = new Map(); for (let i = 0; i < clearCode; i++) dict.set(String(i), i); nextCode = endCode + 1; codeSize = minCodeSize + 1; };
  resetDict();
  const bits = [];
  const pushCode = (code) => { for (let i = 0; i < codeSize; i++) bits.push((code >> i) & 1); };
  pushCode(clearCode);
  let w = String(indices[0]);
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const wk = w + ',' + k;
    if (dict.has(wk)) { w = wk; continue; }
    pushCode(dict.get(w));
    if (nextCode < 4096) {
      dict.set(wk, nextCode++);
      if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
    } else { pushCode(clearCode); resetDict(); }
    w = String(k);
  }
  pushCode(dict.get(w));
  pushCode(endCode);
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) if (bits[i + j]) b |= 1 << j;
    bytes.push(b);
  }
  return bytes;
}

export function encodeGif(imgData, width, height) {
  const data = imgData.data;
  const hasAlpha = (() => { for (let i = 3; i < data.length; i += 4) if (data[i] < 128) return true; return false; })();
  let palette = medianCutPalette(data, hasAlpha ? 255 : 256);
  const transparentIndex = hasAlpha ? palette.length : -1;
  if (hasAlpha) palette = palette.concat([[0, 0, 0]]);
  const bitsPerPixel = Math.max(1, Math.ceil(Math.log2(Math.max(palette.length, 2))));
  const tableSize = 1 << bitsPerPixel;
  const minCodeSize = Math.max(2, bitsPerPixel);

  const indices = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    indices[p] = (hasAlpha && data[i + 3] < 128) ? transparentIndex : nearestPaletteIndex(palette, data[i], data[i + 1], data[i + 2]);
  }

  const out = [];
  const pushStr = s => { for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); };
  const push16 = v => out.push(v & 0xff, (v >> 8) & 0xff);
  pushStr('GIF89a');
  push16(width); push16(height);
  out.push(0xf0 | (bitsPerPixel - 1)); // global colour table present, 2^(N+1) colours
  out.push(0, 0); // background colour index, pixel aspect ratio
  for (let i = 0; i < tableSize; i++) {
    const c = palette[i] || [0, 0, 0];
    out.push(c[0], c[1], c[2]);
  }
  if (hasAlpha) {
    out.push(0x21, 0xf9, 4, 1, 0, 0, transparentIndex, 0); // graphic control extension
  }
  out.push(0x2c); // image descriptor
  push16(0); push16(0); push16(width); push16(height);
  out.push(0); // no local colour table
  out.push(minCodeSize);
  const lzwBytes = lzwEncode(Array.from(indices), minCodeSize);
  for (let i = 0; i < lzwBytes.length; i += 255) {
    const chunk = lzwBytes.slice(i, i + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0); // block terminator
  out.push(0x3b); // trailer
  return new Uint8Array(out);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const body = out.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(body));
  return out;
}

export async function encodePng(bm) {
  const { data, width, height } = bm;
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (width * 4 + 1);
    raw[o] = 0; // filter: None
    raw.set(data.subarray(y * width * 4, (y + 1) * width * 4), o + 1);
  }
  const idat = await streamTransform(raw, 'deflate', 'compress');
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: truecolour with alpha
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}
