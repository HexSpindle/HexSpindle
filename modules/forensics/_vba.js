// VBA macro extraction: MS-OVBA decompression and the dir-stream parse needed to recover module source from an
// OLE vbaProject. Read-only; it recovers text, it does not run anything.
import { decodeLatin1 } from '../../core/util.js';
import { readOle, isOle } from './_ole.js';

// MS-OVBA 2.4.1 "Decompression" of a CompressedContainer. Returns the decompressed bytes.
export function decompressVba(data, start = 0) {
  if (data[start] !== 0x01) throw new Error('Not an MS-OVBA compressed container (no 0x01 signature byte)');
  const out = [];
  let pos = start + 1;
  while (pos + 1 < data.length) {
    const header = data[pos] | (data[pos + 1] << 8); pos += 2;
    const size = (header & 0x0fff) + 1;           // CompressedChunkSize counts the data after the 2-byte header, minus 1
    const compressed = (header & 0x8000) !== 0;
    const chunkEnd = pos + size;
    const chunkStart = out.length;
    if (!compressed) { for (let i = 0; i < 4096 && pos < chunkEnd; i++) out.push(data[pos++]); continue; }
    while (pos < chunkEnd && pos < data.length) {
      const flags = data[pos++];
      for (let bit = 0; bit < 8 && pos < chunkEnd && pos < data.length; bit++) {
        if (!(flags & (1 << bit))) { out.push(data[pos++]); continue; }
        const token = data[pos] | (data[pos + 1] << 8); pos += 2;
        const difference = out.length - chunkStart;
        let bitCount = 4; while ((1 << bitCount) < difference) bitCount++;
        const lengthMask = 0xffff >> bitCount, offsetMask = ~lengthMask & 0xffff;
        const length = (token & lengthMask) + 3;
        const offset = ((token & offsetMask) >> (16 - bitCount)) + 1;
        const from = out.length - offset;
        for (let i = 0; i < length; i++) out.push(out[from + i]);
      }
    }
    pos = chunkEnd;
  }
  return Uint8Array.from(out);
}

// Collect (streamName, textOffset) pairs from the decompressed 'dir' stream by scanning for the two record
// signatures in order, which avoids desync on the records in between.
function modulesFromDir(dir) {
  const names = [], offsets = [];
  const dv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
  for (let i = 0; i + 6 <= dir.length; i++) {
    const id = dv.getUint16(i, true);
    if (id === 0x001a) { const size = dv.getUint32(i + 2, true); if (size > 0 && size < 256 && i + 6 + size <= dir.length) { names.push(decodeLatin1(dir.subarray(i + 6, i + 6 + size))); i += 5 + size; } }
    else if (id === 0x0031 && dv.getUint32(i + 2, true) === 4) { offsets.push(dv.getUint32(i + 6, true)); i += 9; }
  }
  return names.map((name, i) => ({ name, offset: offsets[i] ?? 0 }));
}

// A minimal single-entry ZIP reader (for .docm/.xlsm, where vbaProject.bin is a stored or deflated entry).
async function zipEntry(bytes, wanted, inflate) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Find the End Of Central Directory record.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 65558; i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Not a ZIP (no end-of-central-directory record)');
  let cd = dv.getUint32(eocd + 16, true), count = dv.getUint16(eocd + 10, true);
  for (let n = 0; n < count && cd + 46 <= bytes.length; n++) {
    const nameLen = dv.getUint16(cd + 28, true), extraLen = dv.getUint16(cd + 30, true), commentLen = dv.getUint16(cd + 32, true);
    const name = decodeLatin1(bytes.subarray(cd + 46, cd + 46 + nameLen));
    if (name.toLowerCase() === wanted) {
      const method = dv.getUint16(cd + 10, true), compSize = dv.getUint32(cd + 20, true), lho = dv.getUint32(cd + 42, true);
      const lhNameLen = dv.getUint16(lho + 26, true), lhExtraLen = dv.getUint16(lho + 28, true);
      const dataStart = lho + 30 + lhNameLen + lhExtraLen;
      const comp = bytes.subarray(dataStart, dataStart + compSize);
      return method === 0 ? comp : inflate(comp);
    }
    cd += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

// Returns the vbaProject OLE bytes from either a raw vbaProject.bin (OLE) or a .docm/.xlsm/.pptm ZIP.
export async function getVbaProject(bytes, inflate) {
  if (isOle(bytes)) return bytes;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    for (const path of ['word/vbaproject.bin', 'xl/vbaproject.bin', 'ppt/vbaproject.bin', 'vbaproject.bin']) {
      const entry = await zipEntry(bytes, path, inflate);
      if (entry) return entry;
    }
    throw new Error('This is an Office Open XML file but it contains no vbaProject.bin (no VBA macros)');
  }
  throw new Error('Not an OLE document or an Office Open XML (.docm/.xlsm) file');
}

export function extractModules(oleBytes) {
  const ole = readOle(oleBytes);
  const dirEntry = ole.files.find(f => !f.isStorage && /(?:^|\/)dir$/i.test(f.path));
  if (!dirEntry) throw new Error('No VBA "dir" stream found; this document has no VBA project');
  const storage = dirEntry.path.replace(/\/dir$/i, '');
  const dir = decompressVba(ole.streamOf(dirEntry));
  const modules = modulesFromDir(dir);
  const out = [];
  for (const m of modules) {
    const entry = ole.files.find(f => !f.isStorage && (f.path === `${storage}/${m.name}` || f.name === m.name));
    if (!entry) { out.push({ name: m.name, error: 'module stream not found' }); continue; }
    try {
      const stream = ole.streamOf(entry);
      const source = decodeLatin1(decompressVba(stream, m.offset));
      out.push({ name: m.name, source });
    } catch (e) { out.push({ name: m.name, error: e.message }); }
  }
  return out;
}
