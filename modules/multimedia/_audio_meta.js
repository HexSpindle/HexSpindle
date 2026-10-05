function ascii(bytes, start, len) {
  return new TextDecoder('latin1').decode(bytes.subarray(start, Math.min(bytes.length, start + len)));
}

function trimNul(s) {
  return s.replace(/\u0000+$/, '').trim();
}

export function sniffContainer(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return { type: 'mp3', mime: 'audio/mpeg' };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return { type: 'mp3', mime: 'audio/mpeg' };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') {
    return { type: 'wav', mime: 'audio/wav' };
  }
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === 'fLaC') {
    return { type: 'flac', mime: 'audio/flac' };
  }
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === 'OggS') {
    return { type: 'ogg', mime: 'audio/ogg' };
  }
  return { type: 'unknown', mime: null };
}

/** Parses RIFF/WAVE chunks: the LIST/INFO chunk, the BWF 'bext' chunk, and iXML/axml text chunks. */
export function parseRiffWave(bytes, maxTextBytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const chunks = [];
  let info = null, bext = null, ixml = null, axml = null;
  let off = 12; // past "RIFF" + size(4) + "WAVE"
  while (off + 8 <= bytes.length) {
    const id = ascii(bytes, off, 4);
    const size = dv.getUint32(off + 4, true);
    const dataStart = off + 8;
    chunks.push({ id, size, offset: off });
    if (dataStart + size > bytes.length) break;

    if (id === 'LIST' && ascii(bytes, dataStart, 4) === 'INFO') {
      info = {};
      let p = dataStart + 4;
      const end = dataStart + size;
      while (p + 8 <= end) {
        const subId = ascii(bytes, p, 4);
        const subSize = dv.getUint32(p + 4, true);
        if (p + 8 + subSize > bytes.length) break;
        info[subId] = trimNul(ascii(bytes, p + 8, subSize));
        p += 8 + subSize + (subSize % 2);
      }
    } else if (id === 'bext') {
      bext = {
        description: trimNul(ascii(bytes, dataStart, 256)),
        originator: trimNul(ascii(bytes, dataStart + 256, 32)),
        originatorReference: trimNul(ascii(bytes, dataStart + 288, 32)),
        originationDate: trimNul(ascii(bytes, dataStart + 320, 10)),
        originationTime: trimNul(ascii(bytes, dataStart + 330, 8)),
      };
    } else if (id === 'iXML') {
      ixml = ascii(bytes, dataStart, Math.min(size, maxTextBytes));
    } else if (id === 'axml') {
      axml = ascii(bytes, dataStart, Math.min(size, maxTextBytes));
    }
    off = dataStart + size + (size % 2); // chunks are word (2-byte) aligned
  }
  return { info, bext, ixml, axml, chunks };
}

/** Parses a Vorbis-comment-style block: vendor string + "KEY=VALUE" comment list. */
export function parseVorbisComment(bytes, start) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  let p = start;
  if (p + 4 > bytes.length) throw new Error('Truncated Vorbis comment block.');
  const vendorLen = dv.getUint32(p, true); p += 4;
  if (p + vendorLen > bytes.length) throw new Error('Truncated Vorbis comment vendor string.');
  const vendor = new TextDecoder('utf-8').decode(bytes.subarray(p, p + vendorLen)); p += vendorLen;
  if (p + 4 > bytes.length) throw new Error('Truncated Vorbis comment count.');
  const count = dv.getUint32(p, true); p += 4;
  const comments = [];
  for (let i = 0; i < count && p + 4 <= bytes.length; i++) {
    const len = dv.getUint32(p, true); p += 4;
    if (p + len > bytes.length) break;
    const text = new TextDecoder('utf-8').decode(bytes.subarray(p, p + len));
    p += len;
    const eq = text.indexOf('=');
    comments.push(eq >= 0 ? { key: text.slice(0, eq), value: text.slice(eq + 1) } : { key: text, value: '' });
  }
  return { vendor, comments };
}

/** Parses FLAC metadata blocks after the 'fLaC' magic: STREAMINFO, VORBIS_COMMENT, PICTURE count, others by type/length only. */
export function parseFlac(bytes, maxTextBytes) {
  const blocks = [];
  let vorbisComments = null;
  let pictureCount = 0;
  let off = 4;
  while (off + 4 <= bytes.length) {
    const header = bytes[off];
    const isLast = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const length = (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3];
    const dataStart = off + 4;
    blocks.push({ type, length });
    if (dataStart + length > bytes.length) break;
    if (type === 4) {
      try { vorbisComments = parseVorbisComment(bytes.subarray(0, dataStart + Math.min(length, maxTextBytes)), dataStart); }
      catch { /* leave vorbisComments null on a malformed block */ }
    } else if (type === 6) {
      pictureCount++;
    }
    off = dataStart + length;
    if (isLast) break;
  }
  return { blocks, vorbisComments, pictureCount };
}

/**
 * Best-effort OGG/Opus comment extraction: scans raw bytes for the Vorbis comment packet
 * ("\x03vorbis") or Opus tags packet ("OpusTags") magic and parses the Vorbis-comment structure that
 * immediately follows, rather than doing full Ogg page/packet demuxing. This works for the common
 * case where the comment packet isn't split across an Ogg page boundary, which covers the vast
 * majority of real files (the comment packet is almost always early and small), but is not a
 * complete Ogg parser.
 */
export function parseOgg(bytes) {
  const scanLen = Math.min(bytes.length, 262144);
  const text = new TextDecoder('latin1').decode(bytes.subarray(0, scanLen));
  for (const [marker, codec] of [['\u0003vorbis', 'vorbis'], ['OpusTags', 'opus']]) {
    const idx = text.indexOf(marker);
    if (idx >= 0) {
      try {
        const { vendor, comments } = parseVorbisComment(bytes, idx + marker.length);
        return { codec, vendor, comments };
      } catch {
        return null;
      }
    }
  }
  return null;
}
