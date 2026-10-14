import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseExecutable } from './_exeinfo.js';

const hex = n => (n === null || n === undefined) ? '—' : '0x' + Number(n).toString(16);

module('Detect Executable',
  'Reads the headers of a PE (Windows .exe/.dll), ELF (Linux/Unix) or Mach-O (macOS/iOS) binary and reports the format, CPU architecture, bitness, endianness, file type, entry point and the sections — '
  + 'including the code (.text) section\'s file offset, size and virtual address, so you can extract it and disassemble it. Mach-O universal (fat) binaries list their architecture slices. '
  + 'Only the headers are read; nothing is executed. The architecture it reports is what Disassemble\'s "Auto" mode uses.',
  [A.select('Output', ['Report', 'JSON'])],
  (data, output) => {
    const info = parseExecutable(data);
    if (!info) throw new Error('Not a recognised executable (no PE "MZ", ELF "\\x7fELF" or Mach-O magic at the start)');
    if (output === 'JSON') return JSON.stringify(info, (k, v) => typeof v === 'bigint' ? Number(v) : v, 2);
    const L = [`Format:        ${info.formatLong}`, `Architecture:  ${info.arch}${info.bits ? `  (${info.bits}-bit, ${info.endian}-endian)` : ''}`, `File type:     ${info.type}`];
    if (info.subsystem) L.push(`Subsystem:     ${info.subsystem}`);
    if (info.imageBase !== undefined) L.push(`Image base:    ${hex(info.imageBase)}`);
    if (info.entryPoint !== null && info.entryPoint !== undefined) L.push(`Entry point:   ${hex(info.entryPoint)}`);
    if (info.timestamp) L.push(`Timestamp:     ${info.timestamp}`);
    if (info.slices) L.push('', 'Architecture slices:', ...info.slices.map(s => `  ${s.arch}  at file offset ${hex(s.offset)}`));
    if (info.text) L.push('', `Code section (.text): file offset ${hex(info.text.fileOffset)}, ${info.text.size} bytes, virtual address ${hex(info.text.vaddr)}`);
    if (info.sections && info.sections.length) {
      L.push('', `Sections (${info.sections.length}):`);
      for (const s of info.sections.slice(0, 40)) L.push(`  ${(s.name || '(unnamed)').padEnd(18)} vaddr ${hex(s.vaddr).padEnd(12)} size ${String(s.size).padStart(9)}  file ${hex(s.fileOffset)}${s.code ? '  [code]' : ''}`);
      if (info.sections.length > 40) L.push(`  … and ${info.sections.length - 40} more`);
    }
    L.push('', info.disasmArch
      ? `To disassemble the code: use Disassemble with architecture "${info.disasmArch}" (or "Auto"), or extract the .text section first (offset ${hex(info.text ? info.text.fileOffset : 0)}).`
      : `Disassemble does not support ${info.arch} in this build; extract the .text section for another tool.`);
    return L.join('\n');
  }, { aliases: ['executable', 'pe', 'elf', 'mach-o', 'macho', 'exe', 'dll', 'binary', 'file header', 'peid'] });
