// Reads the headers of the three common executable containers — PE (Windows), ELF (Linux/Unix) and Mach-O
// (macOS/iOS) — to report format, architecture, bitness, endianness, type, entry point and the code (.text)
// section. Shared by the Detect Executable operation and Disassemble's "Auto" architecture mode. Header-only;
// nothing is executed and no section contents are interpreted.

const latin1 = (b, o, n) => { let s = ''; for (let i = 0; i < n && o + i < b.length; i++) s += String.fromCharCode(b[o + i]); return s; };

// Maps an architecture to the label Disassemble exposes (null when this build's Capstone cannot handle it).
const DISASM = { 'x86': 'x86 (32-bit)', 'x86-64': 'x86 (64-bit)', 'ARM': 'ARM', 'ARM (Thumb)': 'ARM (Thumb)', 'ARM64': 'ARM64 (AArch64)' };

// ---- PE ----------------------------------------------------------------------------------------------
const PE_MACHINE = { 0x14c: 'x86', 0x8664: 'x86-64', 0x1c0: 'ARM', 0x1c4: 'ARM (Thumb)', 0xaa64: 'ARM64', 0x200: 'IA-64', 0x5032: 'RISC-V 32', 0x5064: 'RISC-V 64', 0x1f0: 'PowerPC', 0x166: 'MIPS', 0xebc: 'EFI byte code' };
const PE_SUBSYSTEM = { 1: 'Native', 2: 'Windows GUI', 3: 'Windows console', 5: 'OS/2 console', 7: 'POSIX console', 9: 'Windows CE GUI', 10: 'EFI application', 11: 'EFI boot service driver', 12: 'EFI runtime driver', 13: 'EFI ROM', 14: 'Xbox', 16: 'Windows boot application' };

function parsePe(bytes, dv) {
  const peOff = dv.getUint32(0x3c, true);
  if (peOff + 24 > bytes.length || dv.getUint32(peOff, true) !== 0x00004550) return null; // "PE\0\0"
  const coff = peOff + 4;
  const machine = dv.getUint16(coff, true);
  const numSections = dv.getUint16(coff + 2, true);
  const timeStamp = dv.getUint32(coff + 8, true);
  const optSize = dv.getUint16(coff + 16, true);
  const characteristics = dv.getUint16(coff + 18, true);
  const opt = coff + 20;
  const magic = dv.getUint16(opt, true);
  const plus = magic === 0x20b;
  const entryRva = dv.getUint32(opt + 16, true);
  const imageBase = plus ? Number(dv.getBigUint64(opt + 24, true)) : dv.getUint32(opt + 28, true);
  const subsystem = opt + 70 <= bytes.length ? dv.getUint16(opt + 68, true) : 0;
  const arch = PE_MACHINE[machine] || `unknown (0x${machine.toString(16)})`;
  const out = {
    format: 'PE', formatLong: `PE${plus ? '32+' : '32'} (Windows ${plus ? '64-bit' : '32-bit'} image)`,
    arch, bits: plus ? 64 : 32, endian: 'little',
    type: (characteristics & 0x2000) ? 'dynamic library (DLL)' : (characteristics & 0x0002) ? 'executable' : 'object / image',
    entryPoint: imageBase + entryRva, imageBase,
    subsystem: PE_SUBSYSTEM[subsystem] || (subsystem ? `subsystem ${subsystem}` : null),
    timestamp: timeStamp ? new Date(timeStamp * 1000).toISOString() : null,
    sections: [], text: null, disasmArch: DISASM[arch] || null,
  };
  const secTable = opt + optSize;
  for (let i = 0; i < numSections && secTable + i * 40 + 40 <= bytes.length; i++) {
    const s = secTable + i * 40;
    const name = latin1(bytes, s, 8).replace(/\0+$/, '');
    const vsize = dv.getUint32(s + 8, true), vaddr = dv.getUint32(s + 12, true), rawSize = dv.getUint32(s + 16, true), rawPtr = dv.getUint32(s + 20, true), flags = dv.getUint32(s + 36, true);
    out.sections.push({ name, vaddr: imageBase + vaddr, size: vsize, fileOffset: rawPtr, code: !!(flags & 0x20) });
    if (!out.text && (name === '.text' || (flags & 0x20))) out.text = { fileOffset: rawPtr, size: Math.min(vsize || rawSize, rawSize), vaddr: imageBase + vaddr };
  }
  return out;
}

// ---- ELF ---------------------------------------------------------------------------------------------
const ELF_MACHINE = { 2: 'SPARC', 3: 'x86', 8: 'MIPS', 20: 'PowerPC', 21: 'PowerPC64', 22: 'S/390', 40: 'ARM', 42: 'SuperH', 50: 'IA-64', 62: 'x86-64', 183: 'ARM64', 243: 'RISC-V', 258: 'LoongArch' };
const ELF_TYPE = { 1: 'relocatable object', 2: 'executable', 3: 'shared object / PIE', 4: 'core dump' };

function parseElf(bytes, dv) {
  const cls = bytes[4], data = bytes[5];
  if (cls !== 1 && cls !== 2) return null;
  const le = data !== 2;
  const bits = cls === 2 ? 64 : 32;
  const u16 = o => dv.getUint16(o, le), u32 = o => dv.getUint32(o, le);
  const uN = o => bits === 64 ? Number(dv.getBigUint64(o, le)) : dv.getUint32(o, le);
  const eType = u16(16), eMachine = u16(18);
  const arch = ELF_MACHINE[eMachine] || `unknown (${eMachine})`;
  const entry = uN(24);
  const shoff = bits === 64 ? uN(0x28) : uN(0x20);
  const shentsize = bits === 64 ? u16(58) : u16(46);
  const shnum = bits === 64 ? u16(60) : u16(48);
  const shstrndx = bits === 64 ? u16(62) : u16(50);
  const out = {
    format: 'ELF', formatLong: `ELF ${bits}-bit (${le ? 'little' : 'big'}-endian)`, arch, bits, endian: le ? 'little' : 'big',
    type: ELF_TYPE[eType] || `type ${eType}`, entryPoint: entry, sections: [], text: null, disasmArch: DISASM[arch] || null,
  };
  // Section headers → names via the section-header string table.
  if (shoff && shnum && shentsize && shoff + shnum * shentsize <= bytes.length && shstrndx < shnum) {
    const shName = i => u32(shoff + i * shentsize);                                   // sh_name
    const shAddrOff = bits === 64 ? 16 : 12, shOffOff = bits === 64 ? 24 : 16, shSizeOff = bits === 64 ? 32 : 20;
    const strHdr = shoff + shstrndx * shentsize;
    const strOff = uN(strHdr + shOffOff);
    const nameAt = rel => { let s = ''; for (let i = strOff + rel; i < bytes.length && bytes[i]; i++) s += String.fromCharCode(bytes[i]); return s; };
    for (let i = 0; i < shnum; i++) {
      const h = shoff + i * shentsize;
      const name = nameAt(shName(i));
      const addr = uN(h + shAddrOff), off = uN(h + shOffOff), size = uN(h + shSizeOff);
      out.sections.push({ name, vaddr: addr, size, fileOffset: off });
      if (!out.text && name === '.text') out.text = { fileOffset: off, size, vaddr: addr };
    }
  }
  return out;
}

// ---- Mach-O ------------------------------------------------------------------------------------------
const MACHO_CPU = { 7: 'x86', 0x01000007: 'x86-64', 12: 'ARM', 0x0100000c: 'ARM64', 18: 'PowerPC', 0x01000012: 'PowerPC64' };

function parseMachoThin(bytes, dv, magic) {
  const be = magic === 0xfeedface || magic === 0xcffaedfe ? null : null; // decided below
  const is64 = magic === 0xfeedfacf || magic === 0xcffaedfe;
  const swapped = magic === 0xcefaedfe || magic === 0xcffaedfe;         // reversed magic → big-endian fields
  const le = !swapped;
  const u32 = o => dv.getUint32(o, le);
  const cpuType = u32(4) >>> 0;
  const fileType = u32(12);
  const ncmds = u32(16);
  const arch = MACHO_CPU[cpuType] || MACHO_CPU[cpuType & 0xffffff] || `cputype 0x${cpuType.toString(16)}`;
  const TYPE = { 1: 'object', 2: 'executable', 6: 'dynamic library (dylib)', 7: 'dynamic linker', 8: 'bundle', 10: 'dSYM companion' };
  const out = { format: 'Mach-O', formatLong: `Mach-O ${is64 ? '64' : '32'}-bit`, arch, bits: is64 ? 64 : 32, endian: le ? 'little' : 'big',
    type: TYPE[fileType] || `type ${fileType}`, entryPoint: null, sections: [], text: null, disasmArch: DISASM[arch] || null };
  let off = is64 ? 32 : 28;
  for (let i = 0; i < ncmds && off + 8 <= bytes.length; i++) {
    const cmd = u32(off), size = u32(off + 4);
    if (cmd === 0x1 || cmd === 0x19) {                       // LC_SEGMENT / LC_SEGMENT_64
      const seg = is64 && cmd === 0x19;
      const segName = latin1(bytes, off + 8, 16).replace(/\0+$/, '');
      const vmaddr = seg ? Number(dv.getBigUint64(off + 24, le)) : u32(off + 24);
      const nsects = u32(off + (seg ? 64 : 48));
      let sp = off + (seg ? 72 : 56);
      const secSize = seg ? 80 : 68;
      for (let s = 0; s < nsects && sp + secSize <= bytes.length; s++) {
        const secName = latin1(bytes, sp, 16).replace(/\0+$/, '');
        const addr = seg ? Number(dv.getBigUint64(sp + 32, le)) : u32(sp + 32);
        const secSz = seg ? Number(dv.getBigUint64(sp + 40, le)) : u32(sp + 36);
        const fileOff = seg ? u32(sp + 48) : u32(sp + 40);
        out.sections.push({ name: `${segName},${secName}`, vaddr: addr, size: secSz, fileOffset: fileOff });
        if (!out.text && segName === '__TEXT' && secName === '__text') out.text = { fileOffset: fileOff, size: secSz, vaddr: addr };
        sp += secSize;
      }
    } else if (cmd === 0x80000028) {                          // LC_MAIN
      out.entryPoint = Number(dv.getBigUint64(off + 8, le));
    }
    off += size;
  }
  return out;
}

export function parseExecutable(bytes) {
  if (bytes.length < 16) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) return parsePe(bytes, dv);                 // MZ
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) return parseElf(bytes, dv); // \x7fELF
  const magicBE = dv.getUint32(0, false);
  if (magicBE === 0xcafebabe || magicBE === 0xcafebabf) {                                // Mach-O universal (fat)
    const count = dv.getUint32(4, false), is64 = magicBE === 0xcafebabf;
    const entrySize = is64 ? 32 : 20, arches = [];
    for (let i = 0; i < count && 8 + i * entrySize + entrySize <= bytes.length; i++) {
      const e = 8 + i * entrySize, cpu = dv.getUint32(e, false) >>> 0;
      arches.push({ arch: MACHO_CPU[cpu] || `cputype 0x${cpu.toString(16)}`, offset: is64 ? Number(dv.getBigUint64(e + 8, false)) : dv.getUint32(e + 8, false) });
    }
    return { format: 'Mach-O (universal)', formatLong: `Mach-O universal (fat) binary, ${count} architecture${count === 1 ? '' : 's'}`, arch: arches.map(a => a.arch).join(', '), bits: null, endian: 'big', type: 'multi-architecture bundle', entryPoint: null, sections: [], text: null, disasmArch: null, slices: arches };
  }
  const m = dv.getUint32(0, true);
  if (m === 0xfeedface || m === 0xfeedfacf || m === 0xcefaedfe || m === 0xcffaedfe) return parseMachoThin(bytes, dv, m);
  return null;
}
