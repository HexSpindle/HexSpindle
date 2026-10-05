import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1 } from '../../core/util.js';
import { streamTransform } from './_streams.js';

const METHOD_NAMES = { 0: 'Store', 8: 'Deflate', 12: 'BZIP2', 14: 'LZMA', 99: 'AES' };

function dv(u8) { return new DataView(u8.buffer, u8.byteOffset, u8.byteLength); }

function findEOCD(data) {
  const maxBack = Math.min(data.length, 65557);
  for (let i = data.length - 22; i >= data.length - maxBack && i >= 0; i--) {
    if (data[i] === 0x50 && data[i + 1] === 0x4b && data[i + 2] === 0x05 && data[i + 3] === 0x06) return i;
  }
  throw new Error('Not a valid ZIP file: end of central directory record not found');
}

function parseEntries(data) {
  const eocdOff = findEOCD(data);
  const d = dv(data);
  const total = d.getUint16(eocdOff + 10, true);
  let cdOff = d.getUint32(eocdOff + 16, true);
  const entries = [];
  for (let n = 0; n < total; n++) {
    if (data[cdOff] !== 0x50 || data[cdOff + 1] !== 0x4b || data[cdOff + 2] !== 0x01 || data[cdOff + 3] !== 0x02)
      throw new Error('Not a valid ZIP file: central directory entry signature mismatch');
    const gpflag = d.getUint16(cdOff + 8, true);
    const method = d.getUint16(cdOff + 10, true);
    const crc = d.getUint32(cdOff + 16, true);
    const compSize = d.getUint32(cdOff + 20, true);
    const uncompSize = d.getUint32(cdOff + 24, true);
    const nameLen = d.getUint16(cdOff + 28, true);
    const extraLen = d.getUint16(cdOff + 30, true);
    const commentLen = d.getUint16(cdOff + 32, true);
    const localOffset = d.getUint32(cdOff + 42, true);
    const name = decodeLatin1(data.subarray(cdOff + 46, cdOff + 46 + nameLen));
    entries.push({ name, gpflag, method, crc, compSize, uncompSize, localOffset });
    cdOff += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntry(data, e) {
  const d = dv(data);
  if (data[e.localOffset] !== 0x50 || data[e.localOffset + 1] !== 0x4b || data[e.localOffset + 2] !== 0x03 || data[e.localOffset + 3] !== 0x04)
    throw new Error(`'${e.name}': local file header signature mismatch (corrupt archive)`);
  const nameLen = d.getUint16(e.localOffset + 26, true);
  const extraLen = d.getUint16(e.localOffset + 28, true);
  const dataStart = e.localOffset + 30 + nameLen + extraLen;
  const raw = data.subarray(dataStart, dataStart + e.compSize);
  if (e.gpflag & 0x1) throw new Error(`'${e.name}' is password-protected: ZipCrypto/AES decryption isn't supported in this browser-side port`);
  if (e.method === 0) return raw;
  if (e.method === 8) return streamTransform(raw, 'deflate-raw', 'decompress');
  const mname = METHOD_NAMES[e.method] || `method ${e.method}`;
  throw new Error(`Unsupported compression method for '${e.name}': ${mname} isn't supported in this browser-side port`);
}

module('Unzip', 'Lists a ZIP archive, or extracts one file from it (the only file is extracted automatically). Supports unencrypted Store/Deflate entries; ZipCrypto/AES-encrypted and BZIP2/LZMA-compressed entries are not supported in this browser-side port.',
  [A.string('Extract file (name)', ''), A.toggle('Password', '', ['UTF8', 'Hex'], 'UTF8')],
  async (data, name) => {
    let entries;
    try {
      entries = parseEntries(data);
    } catch (e) {
      throw new Error(`Not a valid ZIP file: ${e.message}`);
    }
    const files = entries.filter(e => !e.name.endsWith('/'));
    const target = name || (files.length === 1 ? files[0].name : '');
    if (!target) return files.map(e => `${String(e.uncompSize).padStart(10)}  ${e.name}`).join('\n') + "\n\nSet 'Extract file' to a name above to extract it.";
    const e = files.find(e => e.name === target);
    if (!e) throw new Error(`No such file in archive: ${target}`);
    return readEntry(data, e);
  });
