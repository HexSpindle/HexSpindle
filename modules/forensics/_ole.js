// Reader for the OLE Compound File Binary Format (CFBF / "OLE2"), the container behind legacy Office documents
// (.doc/.xls/.ppt), .msi, .msg and vbaProject.bin. It parses the header, FAT, mini-FAT and directory so callers
// can enumerate storages and streams and read a stream's bytes. No external dependency.
const SIG = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const FREESECT = 0xffffffff, ENDOFCHAIN = 0xfffffffe;

export function isOle(bytes) { return bytes.length >= 8 && SIG.every((b, i) => bytes[i] === b); }

export function readOle(bytes) {
  if (!isOle(bytes)) throw new Error('Not an OLE compound file (no D0CF11E0 signature)');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u32 = off => view.getUint32(off, true);
  const sectorShift = view.getUint16(30, true);
  const sectorSize = 1 << sectorShift;
  const miniSectorSize = 1 << view.getUint16(32, true);
  const miniCutoff = u32(56);
  const firstDir = u32(48);
  const firstMiniFat = u32(60), numMiniFat = u32(64);
  const firstDifat = u32(68), numDifat = u32(72);
  const sectorOffset = sid => (sid + 1) * sectorSize;
  const readSector = sid => bytes.subarray(sectorOffset(sid), sectorOffset(sid) + sectorSize);

  // DIFAT: first 109 entries in the header, then a chain of DIFAT sectors.
  const fatSectors = [];
  for (let i = 0; i < 109; i++) { const sid = u32(76 + i * 4); if (sid !== FREESECT && sid !== ENDOFCHAIN) fatSectors.push(sid); }
  let difatSid = firstDifat, guard = 0;
  while (difatSid !== ENDOFCHAIN && difatSid !== FREESECT && guard++ < numDifat + 2 && difatSid * sectorSize < bytes.length) {
    const s = readSector(difatSid), dv = new DataView(s.buffer, s.byteOffset, s.byteLength);
    for (let i = 0; i < sectorSize / 4 - 1; i++) { const sid = dv.getUint32(i * 4, true); if (sid !== FREESECT && sid !== ENDOFCHAIN) fatSectors.push(sid); }
    difatSid = dv.getUint32(sectorSize - 4, true);
  }
  // FAT: concatenate the FAT sectors into one array of next-sector pointers.
  const fat = new Uint32Array(fatSectors.length * (sectorSize / 4));
  fatSectors.forEach((sid, n) => { const s = readSector(sid), dv = new DataView(s.buffer, s.byteOffset, s.byteLength); for (let i = 0; i < sectorSize / 4; i++) fat[n * (sectorSize / 4) + i] = dv.getUint32(i * 4, true); });

  const chain = (start, table) => { const out = []; let sid = start, g = 0; while (sid !== ENDOFCHAIN && sid !== FREESECT && sid < table.length && g++ < table.length) { out.push(sid); sid = table[sid]; } return out; };
  const readChain = (start, size) => { const parts = chain(start, fat).map(readSector); const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; } return all.subarray(0, size); };

  // Mini-FAT and the mini-stream (the root entry's own stream holds all sub-cutoff streams).
  const miniFatBytes = numMiniFat ? readChain(firstMiniFat, numMiniFat * sectorSize) : new Uint8Array(0);
  const miniFat = new Uint32Array(miniFatBytes.buffer, miniFatBytes.byteOffset, Math.floor(miniFatBytes.length / 4));

  // Directory entries (128 bytes each).
  const dirBytes = readChain(firstDir, chain(firstDir, fat).length * sectorSize);
  const entries = [];
  for (let off = 0; off + 128 <= dirBytes.length; off += 128) {
    const dv = new DataView(dirBytes.buffer, dirBytes.byteOffset + off, 128);
    const nameLen = dv.getUint16(64, true);
    if (nameLen < 2) { entries.push(null); continue; }
    let name = ''; for (let i = 0; i < nameLen - 2; i += 2) name += String.fromCharCode(dv.getUint16(i, true));
    entries.push({ name, type: dv.getUint8(66), left: dv.getUint32(68, true), right: dv.getUint32(72, true), child: dv.getUint32(76, true),
      clsid: [...new Uint8Array(dirBytes.buffer, dirBytes.byteOffset + off + 80, 16)], start: dv.getUint32(116, true), size: Number(dv.getBigUint64(120, true) & 0xffffffffffffn) });
  }
  const root = entries.find(e => e && e.type === 5);
  const miniStream = root ? readChain(root.start, root.size) : new Uint8Array(0);
  const readMini = (start, size) => { const parts = chain(start, miniFat).map(sid => miniStream.subarray(sid * miniSectorSize, sid * miniSectorSize + miniSectorSize)); const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; } return all.subarray(0, size); };

  const streamBytes = e => e.size < miniCutoff && e.type !== 5 ? readMini(e.start, e.size) : readChain(e.start, e.size);

  // Walk the red-black directory tree to build full paths.
  const files = [];
  (function walk(id, path) {
    if (id === FREESECT || id >= entries.length || !entries[id]) return;
    const e = entries[id];
    walk(e.left, path);
    const full = path ? `${path}/${e.name}` : e.name;
    if (e.type === 1 || e.type === 5) { files.push({ ...e, path: full, isStorage: true }); walk(e.child, e.type === 5 ? '' : full); }
    else if (e.type === 2) files.push({ ...e, path: full, isStorage: false });
    walk(e.right, path);
  })(root ? root.child : FREESECT, '');

  return {
    files,
    stream(path) { const e = files.find(f => !f.isStorage && f.path === path); if (!e) throw new Error(`No stream named ${path}`); return streamBytes(e); },
    streamOf(entry) { return streamBytes(entry); },
  };
}
