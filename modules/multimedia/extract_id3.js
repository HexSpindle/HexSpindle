import { module } from './_cat.js';

const FRAME_NAMES = {
  TIT2: 'Title', TT2: 'Title', TPE1: 'Artist', TP1: 'Artist', TALB: 'Album', TAL: 'Album',
  TYER: 'Year', TYE: 'Year', TDRC: 'Date', TRCK: 'Track', TRK: 'Track', TPOS: 'Disc',
  TCON: 'Genre', TCO: 'Genre', TCOM: 'Composer', TCM: 'Composer', TPE2: 'Album artist',
  TBPM: 'BPM', TLEN: 'Length (ms)', TPUB: 'Publisher', TENC: 'Encoded by', TCOP: 'Copyright',
  COMM: 'Comment', COM: 'Comment', USLT: 'Lyrics', WXXX: 'URL', TXXX: 'User text',
};

function decodeId3Text(bytes) {
  if (!bytes.length) return '';
  const enc = bytes[0];
  let body = bytes.subarray(1);
  let str;
  if (enc === 1 || enc === 2) {
    let little = true;
    if (enc === 1 && body.length >= 2 && body[0] === 0xfe && body[1] === 0xff) { little = false; body = body.subarray(2); }
    else if (enc === 1 && body.length >= 2 && body[0] === 0xff && body[1] === 0xfe) { body = body.subarray(2); }
    let s = '';
    for (let i = 0; i + 1 < body.length; i += 2) s += String.fromCharCode(little ? body[i] | (body[i + 1] << 8) : (body[i] << 8) | body[i + 1]);
    str = s;
  } else if (enc === 3) {
    str = new TextDecoder('utf-8').decode(body);
  } else {
    str = new TextDecoder('latin1').decode(body);
  }
  return str.replace(/\u0000+$/, '').replace(/\u0000/g, ' / ');
}

function synchsafe(view, off) {
  return ((view.getUint8(off) & 0x7f) << 21) | ((view.getUint8(off + 1) & 0x7f) << 14) | ((view.getUint8(off + 2) & 0x7f) << 7) | (view.getUint8(off + 3) & 0x7f);
}

function readId3v2(data) {
  if (data.length < 10 || data[0] !== 0x49 || data[1] !== 0x44 || data[2] !== 0x33) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.length);
  const majorVersion = data[3];
  const flags = data[5];
  const tagSize = synchsafe(view, 6);
  let off = 10;
  if (flags & 0x40) { // extended header present
    const extSize = majorVersion >= 4 ? synchsafe(view, off) : view.getUint32(off);
    off += extSize;
  }
  const end = Math.min(data.length, 10 + tagSize);
  const frames = [];
  const idLen = majorVersion === 2 ? 3 : 4;
  while (off + idLen + (majorVersion === 2 ? 3 : 6) <= end) {
    const id = new TextDecoder('latin1').decode(data.subarray(off, off + idLen));
    if (!/^[A-Z0-9]+$/.test(id) || id === '\u0000'.repeat(idLen)) break;
    off += idLen;
    let size;
    if (majorVersion === 2) { size = (data[off] << 16) | (data[off + 1] << 8) | data[off + 2]; off += 3; }
    else { size = majorVersion >= 4 ? synchsafe(view, off) : view.getUint32(off); off += 4; off += 2; /* flags */ }
    if (size < 0 || off + size > data.length) break;
    const body = data.subarray(off, off + size);
    off += size;
    if (id[0] === 'T' || id[0] === 'W' || id === 'COMM' || id === 'COM' || id === 'USLT') {
      let text;
      if (id === 'COMM' || id === 'COM' || id === 'USLT') {
        const rest = body.subarray(4); // skip encoding(1) + language(3)
        const merged = new Uint8Array(1 + rest.length);
        merged[0] = body[0];
        merged.set(rest, 1);
        text = decodeId3Text(merged);
      } else {
        text = decodeId3Text(body);
      }
      frames.push([FRAME_NAMES[id] || id, text]);
    } else {
      frames.push([FRAME_NAMES[id] || id, `<${size} bytes binary>`]);
    }
  }
  return { version: `2.${majorVersion}`, size: tagSize, frames };
}

function readId3v1(data) {
  if (data.length < 128) return null;
  const tag = data.subarray(data.length - 128);
  if (tag[0] !== 0x54 || tag[1] !== 0x41 || tag[2] !== 0x47) return null; // "TAG"
  const dec = new TextDecoder('latin1');
  const field = (start, len) => dec.decode(tag.subarray(start, start + len)).replace(/\u0000+$/, '').trim();
  const title = field(3, 30), artist = field(33, 30), album = field(63, 30), year = field(93, 4);
  const hasTrack = tag[125] === 0 && tag[126] !== 0;
  const comment = field(97, hasTrack ? 28 : 30);
  const genre = tag[127];
  const out = [['Title', title], ['Artist', artist], ['Album', album], ['Year', year], ['Comment', comment]];
  if (hasTrack) out.push(['Track', String(tag[126])]);
  out.push(['Genre', `#${genre}`]);
  return out;
}

module('Extract ID3', 'Reads ID3v1/ID3v2 tags (title, artist, album, ...) from an MP3 file.',
  [], (data) => {
    const v2 = readId3v2(data);
    const v1 = readId3v1(data);
    if (!v2 && !v1) throw new Error('No ID3v1 or ID3v2 tag found (FLAC/OGG/etc. tags are not supported - only ID3)');
    const out = [];
    if (v2) {
      out.push(`ID3v${v2.version} tag (${v2.size} bytes, ${v2.frames.length} frames):`);
      for (const [name, value] of v2.frames) out.push(`  ${name}: ${value}`);
    }
    if (v1) {
      if (out.length) out.push('');
      out.push('ID3v1 tag:');
      for (const [name, value] of v1) if (value) out.push(`  ${name}: ${value}`);
    }
    return out.join('\n');
  });

export { readId3v2, readId3v1 };
