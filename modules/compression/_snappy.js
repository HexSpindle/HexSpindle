function pushVarint(out, n) {
  while (n >= 0x80) { out.push((n & 0x7F) | 0x80); n >>>= 7; }
  out.push(n);
}

export function snappyCompress(data) {
  const n = data.length;
  const out = [];
  pushVarint(out, n);
  const hash = new Map();
  let anchor = 0, i = 0;
  const limit = n - 4;
  while (i <= limit) {
    const key = (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)) >>> 0;
    const cand = hash.get(key);
    hash.set(key, i);
    if (cand !== undefined && data[cand] === data[i] && data[cand + 1] === data[i + 1] && data[cand + 2] === data[i + 2] && data[cand + 3] === data[i + 3]) {
      if (i > anchor) emitLiteral(out, data, anchor, i);
      let len = 4;
      while (i + len < n && data[cand + len] === data[i + len]) len++;
      emitCopy(out, i - cand, len);
      let j = i + 1, end = i + len;
      while (j < end - 3 && j <= limit) { hash.set((data[j] | (data[j+1]<<8) | (data[j+2]<<16) | (data[j+3]<<24)) >>> 0, j); j++; }
      i += len;
      anchor = i;
    } else {
      i++;
    }
  }
  if (anchor < n) emitLiteral(out, data, anchor, n);
  return Uint8Array.from(out);
}

function emitLiteral(out, data, start, end) {
  let len = end - start;
  const n = len - 1;
  if (n < 60) {
    out.push((n << 2) | 0);
  } else {
    const bytes = [];
    let v = n;
    while (v > 0) { bytes.push(v & 0xFF); v >>>= 8; }
    out.push(((59 + bytes.length) << 2) | 0);
    for (const b of bytes) out.push(b);
  }
  for (let k = start; k < end; k++) out.push(data[k]);
}

function emitCopy(out, offset, len) {
  while (len > 0) {
    if (len >= 4 && len <= 11 && offset < 2048) {
      out.push(((len - 4) << 2) | ((offset >> 8) << 5) | 1, offset & 0xFF);
      return;
    } else if (offset < 65536) {
      const l = Math.min(len, 64);
      out.push(((l - 1) << 2) | 2, offset & 0xFF, (offset >> 8) & 0xFF);
      len -= l;
    } else {
      const l = Math.min(len, 64);
      out.push(((l - 1) << 2) | 3, offset & 0xFF, (offset >> 8) & 0xFF, (offset >> 16) & 0xFF, (offset >> 24) & 0xFF);
      len -= l;
    }
  }
}

export function snappyDecompress(data) {
  const corrupt = (why) => { throw new Error(`Corrupt Snappy input: ${why}`); };
  let p = 0;
  let shift = 0, len = 0;
  while (true) {
    if (p >= data.length) corrupt('truncated length header');
    if (shift > 28) corrupt('length header too long');
    const b = data[p++];
    len += (b & 0x7F) * 2 ** shift;
    if (!(b & 0x80)) break;
    shift += 7;
  }
  if (len > 0xFFFFFFFF) corrupt('length header too large');
  // No valid tag stream expands by more than ~22x, so this rejects bogus headers before allocating.
  if (len > (data.length - p) * 32) corrupt('length header does not match data');
  const out = new Uint8Array(len);
  let o = 0;
  const need = (n) => { if (p + n > data.length) corrupt('truncated tag'); };
  while (p < data.length) {
    const tag = data[p++];
    const type = tag & 3;
    if (type === 0) {
      let litLen = tag >> 2;
      if (litLen >= 60) {
        const extra = litLen - 59;
        need(extra);
        litLen = 0;
        for (let k = 0; k < extra; k++) litLen += data[p++] * 2 ** (8 * k);
      }
      litLen += 1;
      need(litLen);
      if (o + litLen > len) corrupt('output exceeds declared length');
      out.set(data.subarray(p, p + litLen), o);
      p += litLen; o += litLen;
    } else {
      let cl, offset;
      if (type === 1) {
        need(1);
        cl = ((tag >> 2) & 7) + 4;
        offset = ((tag >> 5) << 8) | data[p++];
      } else if (type === 2) {
        need(2);
        cl = (tag >> 2) + 1;
        offset = data[p] | (data[p + 1] << 8); p += 2;
      } else {
        need(4);
        cl = (tag >> 2) + 1;
        offset = (data[p] | (data[p + 1] << 8) | (data[p + 2] << 16) | (data[p + 3] << 24)) >>> 0; p += 4;
      }
      if (offset === 0 || offset > o) corrupt('invalid copy offset');
      if (o + cl > len) corrupt('output exceeds declared length');
      copyMatch(out, o, offset, cl); o += cl;
    }
  }
  if (o !== len) corrupt('output shorter than declared length');
  return out;
}

function copyMatch(out, o, offset, len) {
  let from = o - offset;
  for (let k = 0; k < len; k++) { out[o + k] = out[from + k]; }
}
