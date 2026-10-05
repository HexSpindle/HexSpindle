import { module } from './_cat.js';
import { decodeLatin1 } from '../../core/util.js';

const MACHINES = { 0x03: 'x86', 0x3e: 'x86-64', 0x28: 'ARM', 0xb7: 'AArch64', 0x08: 'MIPS', 0xf3: 'RISC-V' };
const TYPES = { 1: 'Relocatable', 2: 'Executable', 3: 'Shared object / PIE', 4: 'Core dump' };
const PT = { 1: 'LOAD', 2: 'DYNAMIC', 3: 'INTERP', 4: 'NOTE', 6: 'PHDR', 7: 'TLS', 0x6474e551: 'GNU_STACK', 0x6474e552: 'GNU_RELRO' };

function findNull(data, start) {
  for (let i = start; i < data.length; i++) if (data[i] === 0) return i;
  return -1;
}

module('Parse ELF Header', 'Decodes a Linux/Unix ELF binary: class, machine, entry point, and program/section headers.', [],
  (data) => {
    if (!(data[0] === 0x7f && data[1] === 0x45 && data[2] === 0x4c && data[3] === 0x46)) throw new Error('Not an ELF file');
    const eiClass = data[4], eiData = data[5];
    const is64 = eiClass === 2;
    const little = eiData === 1;
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);

    let o = 16;
    const etype = dv.getUint16(o, little); o += 2;
    const machine = dv.getUint16(o, little); o += 2;
    dv.getUint32(o, little); o += 4; // version (unused)
    let entry, phoff, shoff;
    if (is64) {
      entry = Number(dv.getBigUint64(o, little)); o += 8;
      phoff = Number(dv.getBigUint64(o, little)); o += 8;
      shoff = Number(dv.getBigUint64(o, little)); o += 8;
    } else {
      entry = dv.getUint32(o, little); o += 4;
      phoff = dv.getUint32(o, little); o += 4;
      shoff = dv.getUint32(o, little); o += 4;
    }
    o += 4; // flags (unused)
    o += 2; // ehsize (unused)
    const phentsize = dv.getUint16(o, little); o += 2;
    const phnum = dv.getUint16(o, little); o += 2;
    const shentsize = dv.getUint16(o, little); o += 2;
    const shnum = dv.getUint16(o, little); o += 2;
    const shstrndx = dv.getUint16(o, little); o += 2;

    const out = [
      `Class: ${is64 ? 'ELF64' : 'ELF32'}`, `Data: ${little ? 'little-endian' : 'big-endian'}`, `Type: ${TYPES[etype] ?? etype}`,
      `Machine: ${MACHINES[machine] ?? '0x' + machine.toString(16)}`, `Entry point: 0x${entry.toString(16)}`,
      `Program headers: ${phnum} (offset 0x${phoff.toString(16)})`, `Section headers: ${shnum} (offset 0x${shoff.toString(16)})`,
    ];
    out.push('\nProgram headers:');
    for (let i = 0; i < phnum; i++) {
      const po = phoff + i * phentsize;
      if (po + phentsize > data.length) break;
      let ptype, pflags, poff, pvaddr, pfsz;
      if (is64) {
        ptype = dv.getUint32(po, little); pflags = dv.getUint32(po + 4, little);
        poff = Number(dv.getBigUint64(po + 8, little)); pvaddr = Number(dv.getBigUint64(po + 16, little));
        pfsz = Number(dv.getBigUint64(po + 32, little));
      } else {
        ptype = dv.getUint32(po, little); poff = dv.getUint32(po + 4, little); pvaddr = dv.getUint32(po + 8, little);
        pfsz = dv.getUint32(po + 16, little); pflags = dv.getUint32(po + 24, little);
      }
      const perm = (pflags & 4 ? 'R' : '-') + (pflags & 2 ? 'W' : '-') + (pflags & 1 ? 'X' : '-');
      const ptname = PT[ptype] ?? '0x' + ptype.toString(16);
      out.push(`  ${ptname.padEnd(12)} off=0x${poff.toString(16)} vaddr=0x${pvaddr.toString(16)} filesz=0x${pfsz.toString(16)} [${perm}]`
        + ((pflags & 2 && pflags & 1) ? '  <- writable+executable (unusual)' : ''));
    }
    if (shnum && shoff && shoff + shnum * shentsize <= data.length) {
      const strtabHdrOff = shoff + shstrndx * shentsize;
      const strtabOff = is64 ? Number(dv.getBigUint64(strtabHdrOff + 24, little)) : dv.getUint32(strtabHdrOff + 16, little);
      out.push('\nSections:');
      for (let i = 0; i < shnum; i++) {
        const so = shoff + i * shentsize;
        let nameoff, saddr, ssize;
        if (is64) {
          nameoff = dv.getUint32(so, little);
          saddr = Number(dv.getBigUint64(so + 16, little));
          ssize = Number(dv.getBigUint64(so + 32, little));
        } else {
          nameoff = dv.getUint32(so, little);
          saddr = dv.getUint32(so + 12, little);
          ssize = dv.getUint32(so + 20, little);
        }
        const nameEnd = findNull(data, strtabOff + nameoff);
        const name = nameEnd > 0 ? decodeLatin1(data.subarray(strtabOff + nameoff, nameEnd)) : '?';
        out.push(`  ${name.padEnd(20)} addr=0x${saddr.toString(16)} size=0x${ssize.toString(16)}`);
      }
    }
    return out.join('\n');
  });
