export function unescapeLatin1(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) {
      const n = s[++i];
      switch (n) {
        case '\\': out.push(92); break;
        case 'n': out.push(10); break;
        case 'r': out.push(13); break;
        case 't': out.push(9); break;
        case 'b': out.push(8); break;
        case 'f': out.push(12); break;
        case 'v': out.push(11); break;
        case '0': out.push(0); break;
        case 'x': { out.push(parseInt(s.substr(i + 1, 2), 16) || 0); i += 2; break; }
        case 'u': {
          const cp = parseInt(s.substr(i + 1, 4), 16) || 0;
          if (cp > 0xFF) throw new Error("'latin-1' codec can't encode character: ordinal not in range(256)");
          out.push(cp); i += 4; break;
        }
        default: out.push(92); out.push(n.charCodeAt(0) & 0xFF);
      }
    } else {
      const cp = c.codePointAt(0);
      if (cp > 0xFF) throw new Error("'latin-1' codec can't encode character: ordinal not in range(256)");
      out.push(cp);
    }
  }
  return Uint8Array.from(out);
}

export function findSub(hay, needle, from = 0) {
  if (needle.length === 0) return from;
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

export function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export function u32be(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
export function u16be(n) { return [(n >>> 8) & 255, n & 255]; }
export function u32le(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
export function u16le(n) { return [n & 255, (n >>> 8) & 255]; }

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(u8, crc = 0) {
  crc = (crc ^ 0xFFFFFFFF) >>> 0;
  for (let i = 0; i < u8.length; i++) crc = crcTable[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
