export function splitLines(data) {
  const out = [];
  let start = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 10) { out.push(data.subarray(start, i)); start = i + 1; }
  }
  out.push(data.subarray(start));
  return out;
}

export function joinLines(lines) {
  const total = lines.reduce((n, l, i) => n + l.length + (i ? 1 : 0), 0);
  const out = new Uint8Array(total);
  let off = 0;
  lines.forEach((l, i) => { if (i) out[off++] = 10; out.set(l, off); off += l.length; });
  return out;
}

export function pySlice(arr, start, end) {
  const n = arr.length;
  const norm = (i, def) => {
    if (i === undefined || i === null) return def;
    return i < 0 ? Math.max(n + i, 0) : Math.min(i, n);
  };
  const s = norm(start, 0), e = norm(end, n);
  return e > s ? arr.subarray(s, e) : arr.subarray(0, 0);
}
