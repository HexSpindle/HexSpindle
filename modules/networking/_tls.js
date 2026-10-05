const GREASE = new Set();
for (let h = 0; h < 16; h++) { const hex = h.toString(16); GREASE.add(parseInt(`${hex}a${hex}a`, 16)); }

function u16(b, i) { return (b[i] << 8) | b[i + 1]; }
function readU16List(b, i, countBytes = 2) {
  let n = 0;
  for (let k = 0; k < countBytes; k++) n = (n << 8) | b[i + k];
  i += countBytes;
  const vals = [];
  for (let j = 0; j < n; j += 2) vals.push(u16(b, i + j));
  return [vals, i + n];
}

export function parseHello(data) {
  let b = data;
  if (b.length > 5 && b[0] === 0x16) {
    const reclen = u16(b, 3);
    b = b.subarray(5, 5 + reclen);
  }
  if (b.length < 4 || (b[0] !== 1 && b[0] !== 2)) throw new Error('Not a recognisable ClientHello/ServerHello (expected handshake type 1 or 2)');
  const htype = b[0];
  const hlen = (b[1] << 16) | (b[2] << 8) | b[3];
  const body = b.subarray(4, 4 + hlen);
  let i = 0;
  const version = u16(body, i); i += 2;
  i += 32; // random
  const sidlen = body[i];
  i += 1 + sidlen;
  const out = { type: htype === 1 ? 'ClientHello' : 'ServerHello', version };
  if (htype === 1) {
    let ciphers; [ciphers, i] = readU16List(body, i);
    const complen = body[i];
    i += 1 + complen;
    out.ciphers = ciphers;
  } else {
    const cipher = u16(body, i); i += 2;
    i += 1; // compression method
    out.cipher = cipher;
  }
  let extensions = [], curves = [], points = [];
  if (i + 2 <= body.length) {
    const extlen = u16(body, i); i += 2;
    const end = i + extlen;
    while (i + 4 <= end) {
      const etype = u16(body, i);
      const elen = u16(body, i + 2);
      const edata = body.subarray(i + 4, i + 4 + elen);
      extensions.push(etype);
      if (etype === 10 && htype === 1) { [curves] = readU16List(edata, 0); }
      if (etype === 11 && htype === 1) {
        const n = edata.length ? edata[0] : 0;
        points = [...edata.subarray(1, 1 + n)];
      }
      i += 4 + elen;
    }
  }
  out.extensions = extensions;
  out.curves = curves;
  out.point_formats = points;
  return out;
}

export function ja3String(info, degrease = true) {
  const fmt = vals => (degrease ? vals.filter(v => !GREASE.has(v)) : vals).join('-');
  return `${info.version},${fmt(info.ciphers || [])},${fmt(info.extensions || [])},${fmt(info.curves || [])},${fmt(info.point_formats || [])}`;
}

export function ja3sString(info, degrease = true) {
  const ext = (info.extensions || []).filter(e => !degrease || !GREASE.has(e));
  return `${info.version},${info.cipher ?? ''},${ext.join('-')}`;
}
