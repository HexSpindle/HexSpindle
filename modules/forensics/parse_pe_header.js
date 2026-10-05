import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1 } from '../../core/util.js';

const MACHINES = { 0x14c: 'x86', 0x8664: 'x64', 0x1c0: 'ARM', 0xaa64: 'ARM64', 0x1c4: 'ARMNT' };
const SUBSYSTEMS = { 1: 'Native', 2: 'Windows GUI', 3: 'Windows CUI', 7: 'POSIX CUI', 9: 'Windows CE GUI', 10: 'EFI application' };

const DLL_CHARS = [
  [0x0040, 'DYNAMIC_BASE (ASLR)'], [0x0100, 'NX_COMPAT (DEP)'], [0x0400, 'NO_SEH'],
  [0x4000, 'GUARD_CF (CFG)'], [0x0020, 'HIGH_ENTROPY_VA'], [0x8000, 'TERMINAL_SERVER_AWARE'],
];

function shannon(u8) {
  const n = u8.length || 1;
  const counts = new Map();
  for (const b of u8) counts.set(b, (counts.get(b) || 0) + 1);
  let e = 0;
  for (const c of counts.values()) { const p = c / n; e -= p * Math.log2(p); }
  return e;
}

function findNull(data, start) {
  for (let i = start; i < data.length; i++) if (data[i] === 0) return i;
  return -1;
}

function isoFromUnix(ts) {
  const d = new Date(ts * 1000);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`;
}

module('Parse PE Header', 'Decodes a Windows PE (EXE/DLL) file: machine type, timestamp, sections, imports and security mitigations (ASLR/DEP/CFG).', [A.boolean('List imported DLLs', true)],
  (data, listImports) => {
    if (!(data[0] === 0x4d && data[1] === 0x5a)) throw new Error('Not a PE file (missing MZ signature)');
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const peOff = dv.getUint32(0x3c, true);
    if (!(data[peOff] === 0x50 && data[peOff + 1] === 0x45 && data[peOff + 2] === 0 && data[peOff + 3] === 0)) throw new Error('PE signature not found');

    const machine = dv.getUint16(peOff + 4, true);
    const nsec = dv.getUint16(peOff + 6, true);
    const ts = dv.getUint32(peOff + 8, true);
    const optSize = dv.getUint16(peOff + 20, true);
    const chars = dv.getUint16(peOff + 22, true);

    const out = [
      `Machine: ${MACHINES[machine] ?? '0x' + machine.toString(16)}`, `Number of sections: ${nsec}`,
      (ts > 0 && ts < 2 ** 31) ? `Timestamp: ${isoFromUnix(ts)}` : `Timestamp: ${ts} (not a plausible date)`,
      `Characteristics: 0x${chars.toString(16).padStart(4, '0')}` + (chars & 0x2000 ? '  [DLL]' : chars & 0x0002 ? '  [EXE]' : ''),
    ];

    const optOff = peOff + 24;
    const magic = optSize ? dv.getUint16(optOff, true) : 0;
    const pe32plus = magic === 0x20b;
    if (optSize) {
      const subsystem = dv.getUint16(optOff + 68, true);
      const dllchars = dv.getUint16(optOff + 70, true);
      const entry = dv.getUint32(optOff + 16, true);
      const imagebase = pe32plus ? Number(dv.getBigUint64(optOff + 24, true)) : dv.getUint32(optOff + 24, true);
      out.push(`PE format: ${pe32plus ? 'PE32+' : 'PE32'}`, `Entry point RVA: 0x${entry.toString(16)}`, `Image base: 0x${imagebase.toString(16)}`,
        `Subsystem: ${SUBSYSTEMS[subsystem] ?? subsystem}`,
        'Security mitigations: ' + (DLL_CHARS.filter(([k]) => dllchars & k).map(([, v]) => v).join(', ') || 'none detected'));
    }

    const secOff = optOff + optSize;
    out.push('\nSections:');
    const namesForImports = [];
    for (let i = 0; i < nsec; i++) {
      const o = secOff + i * 40;
      if (o + 40 > data.length) break;
      let end = 8;
      while (end > 0 && data[o + end - 1] === 0) end--;
      const name = decodeLatin1(data.subarray(o, o + end));
      const vsize = dv.getUint32(o + 8, true), vaddr = dv.getUint32(o + 12, true), rawsize = dv.getUint32(o + 16, true), rawptr = dv.getUint32(o + 20, true);
      const sflags = dv.getUint32(o + 36, true);
      let ent = 0.0;
      if (rawsize && rawptr + rawsize <= data.length) ent = shannon(data.subarray(rawptr, rawptr + Math.min(rawsize, 1 << 16)));
      const flags = [];
      if (sflags & 0x20000000) flags.push('EXEC');
      if (sflags & 0x80000000) flags.push('WRITE');
      if (sflags & 0x40000000) flags.push('READ');
      out.push(`  ${name.padEnd(10)} VA=0x${vaddr.toString(16).padStart(8, '0')} VSize=0x${vsize.toString(16)} RawSize=0x${rawsize.toString(16)} Entropy=${ent.toFixed(2)} [${flags.join(',')}]`
        + (ent > 7.2 ? '  <- high entropy (packed/encrypted?)' : ''));
      namesForImports.push([name, vaddr, rawptr]);
    }

    if (listImports) {
      try {
        const importRva = dv.getUint32(optOff + (pe32plus ? 112 : 96) + 8, true);
        const rva2off = (rva) => {
          for (let idx = 0; idx < namesForImports.length; idx++) {
            const [, vaddr] = namesForImports[idx];
            const o2 = secOff + idx * 40;
            const vsize = dv.getUint32(o2 + 8, true);
            if (vaddr <= rva && rva < vaddr + vsize) return namesForImports[idx][2] + (rva - vaddr);
          }
          return null;
        };
        const off = rva2off(importRva);
        const dlls = [];
        if (off) {
          let i = off;
          while (i + 20 <= data.length) {
            const nameRva = dv.getUint32(i + 12, true);
            if (nameRva === 0) break;
            const noff = rva2off(nameRva);
            if (noff) {
              const end = findNull(data, noff);
              if (end === -1) throw new Error('unterminated DLL name');
              dlls.push(decodeLatin1(data.subarray(noff, end)));
            }
            i += 20;
          }
        }
        if (dlls.length) { out.push('\nImported DLLs:'); out.push(...dlls.map(d => `  ${d}`)); }
      } catch { /* pass around import-table parsing */ }
    }
    return out.join('\n');
  });
