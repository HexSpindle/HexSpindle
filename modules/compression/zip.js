import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { encodeUtf8 } from '../../core/util.js';
import { concat, crc32, u16le, u32le } from './_bytes.js';
import { streamTransform } from './_streams.js';

module('Zip', 'Creates a single-file ZIP archive from the input (Deflate or Store; BZIP2/LZMA methods and AES-256 password protection are not supported in this browser-side port).',
  [A.string('Filename', 'file.txt'), A.string('Comment', ''), A.select('Compression method', ['Deflate', 'None', 'BZIP2', 'LZMA']),
   A.toggle('Password (blank = unencrypted)', '', ['UTF8', 'Hex'], 'UTF8')],
  async (data, name, comment, method, pw) => {
    if (pw.length) throw new Error("Password-protected (AES-256) ZIP creation isn't supported in this browser-side port");
    if (method !== 'Deflate' && method !== 'None') throw new Error(`${method} compression isn't supported for creating ZIPs in this browser-side port; use Deflate or None`);

    const nameB = encodeUtf8(name);
    const commentB = encodeUtf8(comment);
    const methodCode = method === 'Deflate' ? 8 : 0;
    const compressed = method === 'Deflate' ? await streamTransform(data, 'deflate-raw', 'compress') : data;
    const crc = crc32(data);

    const localHeader = concat(
      Uint8Array.from(u32le(0x04034b50)), Uint8Array.from(u16le(20)), Uint8Array.from(u16le(0)),
      Uint8Array.from(u16le(methodCode)), Uint8Array.from(u16le(0)), Uint8Array.from(u16le(0x21)),
      Uint8Array.from(u32le(crc)), Uint8Array.from(u32le(compressed.length)), Uint8Array.from(u32le(data.length)),
      Uint8Array.from(u16le(nameB.length)), Uint8Array.from(u16le(0)), nameB);
    const localRecord = concat(localHeader, compressed);

    const centralHeader = concat(
      Uint8Array.from(u32le(0x02014b50)), Uint8Array.from(u16le(20)), Uint8Array.from(u16le(20)), Uint8Array.from(u16le(0)),
      Uint8Array.from(u16le(methodCode)), Uint8Array.from(u16le(0)), Uint8Array.from(u16le(0x21)),
      Uint8Array.from(u32le(crc)), Uint8Array.from(u32le(compressed.length)), Uint8Array.from(u32le(data.length)),
      Uint8Array.from(u16le(nameB.length)), Uint8Array.from(u16le(0)), Uint8Array.from(u16le(0)),
      Uint8Array.from(u16le(0)), Uint8Array.from(u16le(0)), Uint8Array.from(u32le(0)), Uint8Array.from(u32le(0)), nameB);

    const eocd = concat(
      Uint8Array.from(u32le(0x06054b50)), Uint8Array.from(u16le(0)), Uint8Array.from(u16le(0)),
      Uint8Array.from(u16le(1)), Uint8Array.from(u16le(1)), Uint8Array.from(u32le(centralHeader.length)),
      Uint8Array.from(u32le(localRecord.length)), Uint8Array.from(u16le(commentB.length)), commentB);

    return concat(localRecord, centralHeader, eocd);
  });
