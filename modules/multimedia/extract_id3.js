import { module } from './_cat.js';
import { FRAME_DESCRIPTIONS } from './_id3_frames.js';

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

function extractId3v2Json(input) {
  if (!(input[0] === 0x49 && input[1] === 0x44 && input[2] === 0x33)) throw new Error('No valid ID3 header.');
  const result = {
    Type: 'ID3',
    Version: `${input[3]}.${input[4]}`,
    Flags: String(input[5]),
  };
  let pos = 6;
  const readSize = (num) => {
    let r = 0;
    for (let i = num * 7; i; i -= 7) { r = (r << i) | input[pos]; pos += 1; }
    return r;
  };
  const headerTagSize = readSize(4);
  result.Size = String(headerTagSize);
  const tags = {};
  let at = 10;
  while (at < headerTagSize) {
    let id = String.fromCharCode(input[pos], input[pos + 1], input[pos + 2]);
    pos += 3;
    if (input[pos] !== 0) id += String.fromCharCode(input[pos]);
    pos += 1;
    if (id in FRAME_DESCRIPTIONS) {
      const size = readSize(4);
      const frame = { Size: String(size), Description: FRAME_DESCRIPTIONS[id] };
      pos += 2; // frame flags
      let data = '';
      for (let i = 1; i < size; i++) data += String.fromCharCode(input[pos + i]);
      frame.Data = data;
      pos += size;
      tags[id] = frame;
      at += 10 + size;
    } else if (id === '\u0000\u0000\u0000') {
      break;
    } else {
      throw new Error('Unknown Frame Identifier: ' + id);
    }
  }
  result.Tags = tags;
  return JSON.stringify(result, null, 4);
}

module('Extract ID3',
  'Extracts the ID3v2 metadata (title, artist, album, track number, ...) of an MP3 file as JSON. ' +
  'Files that carry only an ID3v1 tag - the 128-byte block at the end of the file, which the JSON ' +
  'format has no room for - get a short text summary of that tag instead.',
  [], (data) => {
    if (data.length >= 3 && data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) return extractId3v2Json(data);
    const v1 = readId3v1(data);
    if (!v1) throw new Error('No valid ID3 header.');
    const out = ['ID3v1 tag:'];
    for (const [name, value] of v1) if (value) out.push(`  ${name}: ${value}`);
    return out.join('\n');
  });
