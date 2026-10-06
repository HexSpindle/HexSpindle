import { module } from './_cat.js';

const ALIGN = 30;
const pad = s => s.padEnd(ALIGN);
const hex = (v, n = 2) => v.toString(16).padStart(n, '0');
const bin = (v, n = 8) => v.toString(2).padStart(n, '0');

const ABIS = {
  0x00: 'System V', 0x01: 'HP-UX', 0x02: 'NetBSD', 0x03: 'Linux', 0x04: 'GNU Hurd', 0x06: 'Solaris',
  0x07: 'AIX', 0x08: 'IRIX', 0x09: 'FreeBSD', 0x0a: 'Tru64', 0x0b: 'Novell Modesto', 0x0c: 'OpenBSD',
  0x0d: 'OpenVMS', 0x0e: 'NonStop Kernel', 0x0f: 'AROS', 0x10: 'Fenix OS', 0x11: 'CloudABI',
  0x12: 'Stratus Technologies OpenVOS',
};

const E_TYPES = {
  0x0000: 'Unknown', 0x0001: 'Relocatable File', 0x0002: 'Executable File', 0x0003: 'Shared Object',
  0x0004: 'Core File', 0xfe00: 'LOOS', 0xfeff: 'HIOS', 0xff00: 'LOPROC', 0xffff: 'HIPROC',
};

const ISAS = {
  0x0000: 'No specific instruction set', 0x0001: 'AT&T WE 32100', 0x0002: 'SPARC', 0x0003: 'x86',
  0x0004: 'Motorola 68000 (M68k)', 0x0005: 'Motorola 88000 (M88k)', 0x0006: 'Intel MCU',
  0x0007: 'Intel 80860', 0x0008: 'MIPS', 0x0009: 'IBM System/370', 0x000a: 'MIPS RS3000 Little-endian',
  0x000f: 'Hewlett-Packard PA-RISC', 0x0011: 'Fujitsu VPP500', 0x0012: 'Enhanced instruction set SPARC',
  0x0013: 'Intel 80960', 0x0014: 'PowerPC', 0x0015: 'PowerPC (64-bit)', 0x0016: 'S390, including S390',
  0x0017: 'IBM SPU/SPC', 0x0024: 'NEC V800', 0x0025: 'Fujitsu FR20', 0x0026: 'TRW RH-32',
  0x0027: 'Motorola RCE', 0x0028: 'ARM (up to ARMv7/Aarch32)', 0x0029: 'Digital Alpha', 0x002a: 'SuperH',
  0x002b: 'SPARC Version 9', 0x002c: 'Siemens TriCore embedded processor', 0x002d: 'Argonaut RISC Core',
  0x002e: 'Hitachi H8/300', 0x002f: 'Hitachi H8/300H', 0x0030: 'Hitachi H8S', 0x0031: 'Hitachi H8/500',
  0x0032: 'IA-64', 0x0033: 'Standford MIPS-X', 0x0034: 'Motorola ColdFire', 0x0035: 'Motorola M68HC12',
  0x0036: 'Fujitsu MMA Multimedia Accelerator', 0x0037: 'Siemens PCP',
  0x0038: 'Sony nCPU embedded RISC processor', 0x0039: 'Denso NDR1 microprocessor',
  0x003a: 'Motorola Star*Core processor', 0x003b: 'Toyota ME16 processor',
  0x003c: 'STMicroelectronics ST100 processor',
  0x003d: 'Advanced Logic Corp. TinyJ embedded processor family', 0x003e: 'AMD x86-64',
  0x003f: 'Sony DSP Processor', 0x0040: 'Digital Equipment Corp. PDP-10',
  0x0041: 'Digital Equipment Corp. PDP-11', 0x0042: 'Siemens FX66 microcontroller',
  0x0043: 'STMicroelectronics ST9+ 8/16 bit microcontroller',
  0x0044: 'STMicroelectronics ST7 8-bit microcontroller', 0x0045: 'Motorola MC68HC16 Microcontroller',
  0x0046: 'Motorola MC68HC11 Microcontroller', 0x0047: 'Motorola MC68HC08 Microcontroller',
  0x0048: 'Motorola MC68HC05 Microcontroller', 0x0049: 'Silicon Graphics SVx',
  0x004a: 'STMicroelectronics ST19 8-bit microcontroller', 0x004b: 'Digital VAX',
  0x004c: 'Axis Communications 32-bit embedded processor',
  0x004d: 'Infineon Technologies 32-bit embedded processor', 0x004e: 'Element 14 64-bit DSP Processor',
  0x004f: 'LSI Logic 16-bit DSP Processor', 0x0050: "Donald Knuth's educational 64-bit processor",
  0x0051: 'Harvard University machine-independent object files', 0x0052: 'SiTera Prism',
  0x0053: 'Atmel AVR 8-bit microcontroller', 0x0054: 'Fujitsu FR30', 0x0055: 'Mitsubishi D10V',
  0x0056: 'Mitsubishi D30V', 0x0057: 'NEC v850', 0x0058: 'Mitsubishi M32R', 0x0059: 'Matsushita MN10300',
  0x005a: 'Matsushita MN10200', 0x005b: 'picoJava', 0x005c: 'OpenRISC 32-bit embedded processor',
  0x005d: 'ARC Cores Tangent-A5', 0x005e: 'Tensilica Xtensa Architecture',
  0x005f: 'Alphamosaic VideoCore processor', 0x0060: 'Thompson Multimedia General Purpose Processor',
  0x0061: 'National Semiconductor 32000 series', 0x0062: 'Tenor Network TPC processor',
  0x0063: 'Trebia SNP 1000 processor', 0x0064: 'STMicroelectronics (www.st.com) ST200 microcontroller',
  0x008c: 'TMS320C6000 Family', 0x00af: 'MCST Elbrus e2k', 0x00b7: 'ARM 64-bits (ARMv8/Aarch64)',
  0x00f3: 'RISC-V', 0x00f7: 'Berkeley Packet Filter', 0x0101: 'WDC 65C816',
};
for (const r of [[0x000b, 0x000e], [0x0018, 0x0023]]) for (let i = r[0]; i <= r[1]; i++) ISAS[i] = 'Reserved for future use';

const PH_TYPES = {
  0: 'Unused', 1: 'Loadable Segment', 2: 'Dynamic linking information', 3: 'Interpreter Information',
  4: 'Auxiliary Information', 5: 'Reserved', 6: 'Program Header Table', 7: 'Thread-Local Storage Template',
};

const SH_TYPES = {
  1: 'Program Data', 2: 'Symbol Table', 3: 'String Table', 4: 'Relocation Entries with Addens',
  5: 'Symbol Hash Table', 6: 'Dynamic Linking Information', 7: 'Notes', 8: 'Program Space with No Data',
  9: 'Relocation Entries with no Addens', 0x0a: 'Reserved', 0x0b: 'Dynamic Linker Symbol Table',
  0x0e: 'Array of Constructors', 0x0f: 'Array of Destructors', 0x10: 'Array of pre-constructors',
  0x11: 'Section group', 0x12: 'Extended section indices', 0x13: 'Number of defined types',
};

const SH_FLAG_MASKS = [
  [0x00000001, 'Writable'], [0x00000002, 'Alloc'], [0x00000004, 'Executable'], [0x00000010, 'Merge'],
  [0x00000020, 'Strings'], [0x00000040, 'SHT Info Link'], [0x00000080, 'Link Order'],
  [0x00000100, 'OS Specific Handling'], [0x00000200, 'Group'], [0x00000400, 'Thread Local Data'],
  [0x0ff00000, 'OS-Specific'], [0xf0000000, 'Processor Specific'],
  [0x04000000, 'Special Ordering (Solaris)'], [0x08000000, 'Excluded (Solaris)'],
];

/** A byte cursor over the file, with readelf-style little/big-endian integer reads. */
class Cursor {
  constructor(bytes) { this.bytes = bytes; this.length = bytes.length; this.position = 0; }
  moveTo(p) { if (p < 0 || p > this.length) throw new Error(`Cannot move to position ${p} in stream. Out of bounds.`); this.position = p; }
  moveForwardsBy(n) { this.moveTo(this.position + n); }
  getBytes(n) { const out = this.bytes.slice(this.position, this.position + n); this.position += n; return out; }
  readInt(n, endianness = 'be') {
    let v = 0;
    if (endianness === 'be') for (let i = this.position; i < this.position + n; i++) v = (v << 8) | this.bytes[i];
    else for (let i = this.position + n - 1; i >= this.position; i--) v = (v << 8) | this.bytes[i];
    this.position += n;
    return v;
  }
  /** Reads to the next NUL byte (or the end of the file) and leaves the position at the end. */
  readString() {
    let out = '';
    for (let i = this.position; i < this.length; i++) {
      if (this.bytes[i] === 0) break;
      out += String.fromCharCode(this.bytes[i]);
    }
    this.position = this.length;
    return out;
  }
}

module('Parse ELF Header', 'Implements readelf-like functionality: extracts the ELF header, program headers, section headers and symbol table of an ELF file.', [],
  (data) => {
    const s = new Cursor(data);
    let format = 0, endianness = '', entry = 0, phoff = 0, phEntries = 0;
    let shoff = 0, shEntries = 0, shentSize = 0, shstrtab = 0, namesOffset = 0;
    let symtabOffset = 0, symtabSize = 0, symtabEntSize = 0, strtabOffset = 0;

    function readString(namesOff, nameOff) {
      const preMove = s.position;
      s.moveTo(namesOff + nameOff);
      const out = s.readString();
      s.moveTo(preMove);
      return out;
    }

    function elfHeader() {
      const out = [];
      const magic = s.getBytes(4);
      if (magic.join('') !== [0x7f, 0x45, 0x4c, 0x46].join('')) throw new Error('Invalid ELF');
      out.push(pad('Magic:') + String.fromCharCode(...magic));
      format = s.readInt(1);
      out.push(pad('Format:') + (format === 1 ? '32-bit' : '64-bit'));
      endianness = s.readInt(1) === 1 ? 'le' : 'be';
      out.push(pad('Endianness:') + (endianness === 'le' ? 'Little' : 'Big'));
      out.push(pad('Version:') + s.readInt(1).toString());
      const abi = ABIS[s.readInt(1)] ?? '';
      out.push(pad('ABI:') + abi);
      const abiVersion = s.readInt(1).toString();
      // The Linux kernel does not use the ABI Version field.
      if (abi !== 'Linux') out.push(pad('ABI Version:') + abiVersion);
      s.moveForwardsBy(7);
      out.push(pad('Type:') + (E_TYPES[s.readInt(2, endianness)] ?? ''));
      out.push(pad('Instruction Set Architecture:') + (ISAS[s.readInt(2, endianness)] ?? 'Unimplemented'));
      out.push(pad('ELF Version:') + s.readInt(4, endianness));
      const readSize = format === 1 ? 4 : 8;
      entry = s.readInt(readSize, endianness);
      phoff = s.readInt(readSize, endianness);
      shoff = s.readInt(readSize, endianness);
      out.push(pad('Entry Point:') + `0x${hex(entry)}`);
      out.push(pad('Entry PHOFF:') + `0x${hex(phoff)}`);
      out.push(pad('Entry SHOFF:') + `0x${hex(shoff)}`);
      out.push(pad('Flags:') + bin(s.readInt(4, endianness)));
      out.push(pad('ELF Header Size:') + `${s.readInt(2, endianness)} bytes`);
      out.push(pad('Program Header Size:') + `${s.readInt(2, endianness)} bytes`);
      phEntries = s.readInt(2, endianness);
      out.push(pad('Program Header Entries:') + phEntries);
      shentSize = s.readInt(2, endianness);
      out.push(pad('Section Header Size:') + shentSize + ' bytes');
      shEntries = s.readInt(2, endianness);
      out.push(pad('Section Header Entries:') + shEntries);
      shstrtab = s.readInt(2, endianness);
      out.push(pad('Section Header Names:') + shstrtab);
      return out.join('\n');
    }

    function phFlags(flags) {
      const r = [];
      if (flags & 0x1) r.push('Execute');
      if (flags & 0x2) r.push('Write');
      if (flags & 0x4) r.push('Read');
      if (flags & 0xf0000000) r.push('Unspecified');
      return r.join(',');
    }

    function programHeader() {
      const out = [];
      const t = s.readInt(4, endianness);
      let pType = PH_TYPES[t] ?? '';
      if (pType === '' && t >= 0x60000000 && t <= 0x6fffffff) pType = 'Reserved Inclusive Range. OS Specific';
      else if (pType === '' && t >= 0x70000000 && t <= 0x7fffffff) pType = 'Reserved Inclusive Range. Processor Specific';
      out.push(pad('Program Header Type:') + pType);
      if (format === 2) out.push(pad('Flags:') + phFlags(s.readInt(4, endianness)));
      const readSize = format === 1 ? 4 : 8;
      out.push(pad('Offset Of Segment:') + s.readInt(readSize, endianness));
      out.push(pad('Virtual Address of Segment:') + s.readInt(readSize, endianness));
      out.push(pad('Physical Address of Segment:') + s.readInt(readSize, endianness));
      out.push(pad('Size of Segment:') + `${s.readInt(readSize, endianness)} bytes`);
      out.push(pad('Size of Segment in Memory:') + `${s.readInt(readSize, endianness)} bytes`);
      if (format === 1) out.push(pad('Flags:') + phFlags(s.readInt(4, endianness)));
      s.moveForwardsBy(readSize);
      return out.join('\n');
    }

    function sectionHeader() {
      const out = [];
      const nameOffset = s.readInt(4, endianness);
      const t = s.readInt(4, endianness);
      let type = SH_TYPES[t];
      if (type === undefined) {
        if (t >= 0x60000000 && t <= 0x6fffffff) type = 'OS-specific';
        else if (t >= 0x70000000 && t <= 0x7fffffff) type = 'Processor-specific';
        else if (t >= 0x80000000 && t <= 0x8fffffff) type = 'Application-specific';
        else type = 'Unused';
      }
      out.push(pad('Type:') + type);
      let nameResult = '';
      if (type !== 'Unused') {
        nameResult = readString(namesOffset, nameOffset);
        out.push(pad('Section Name: ') + nameResult);
      }
      const readSize = format === 1 ? 4 : 8;
      const flags = s.readInt(readSize, endianness);
      const shFlags = [];
      for (const [mask, name] of SH_FLAG_MASKS) if (flags & mask) shFlags.push(name);
      out.push(pad('Flags:') + shFlags);
      out.push(pad('Section Vaddr in memory:') + s.readInt(readSize, endianness));
      const shoffset = s.readInt(readSize, endianness);
      out.push(pad('Offset of the section:') + shoffset);
      const secSize = s.readInt(readSize, endianness);
      out.push(pad('Section Size:') + secSize);
      out.push(pad('Associated Section:') + s.readInt(4, endianness));
      out.push(pad('Section Extra Information:') + s.readInt(4, endianness));
      s.moveForwardsBy(readSize); // alignment field
      const entSize = s.readInt(readSize, endianness);
      if (nameResult === '.strtab') strtabOffset = shoffset;
      else if (nameResult === '.symtab') { symtabOffset = shoffset; symtabSize = secSize; symtabEntSize = entSize; }
      return out.join('\n');
    }

    function getNamesOffset() {
      const preMove = s.position;
      s.moveTo(shoff + shentSize * shstrtab);
      if (format === 1) { s.moveForwardsBy(0x10); namesOffset = s.readInt(4, endianness); }
      else { s.moveForwardsBy(0x18); namesOffset = s.readInt(8, endianness); }
      s.position = preMove;
    }

    function getSymbol() {
      const nameOffset = s.readInt(4, endianness);
      s.moveForwardsBy(format === 2 ? 20 : 12);
      return readString(strtabOffset, nameOffset);
    }

    const bar = '='.repeat(ALIGN);
    const result = [`${bar} ELF Header ${bar}`];
    result.push(elfHeader() + '\n');
    getNamesOffset();

    result.push(`${bar} Program Header ${bar}`);
    s.moveTo(phoff);
    for (let i = 0; i < phEntries; i++) result.push(programHeader() + '\n');

    result.push(`${bar} Section Header ${bar}`);
    s.moveTo(shoff);
    for (let i = 0; i < shEntries; i++) result.push(sectionHeader() + '\n');

    result.push(`${bar} Symbol Table ${bar}`);
    s.moveTo(symtabOffset);
    for (let i = 0; i < symtabSize / symtabEntSize; i++) {
      const name = getSymbol();
      if (name !== '') result.push(pad('Symbol Name:') + name);
    }
    return result.join('\n');
  });
