import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1, bytesToHex } from '../../core/util.js';
import { parseExecutable } from './_exeinfo.js';

let enginePromise = null;
function getEngine() {
  if (!enginePromise) enginePromise = import('./_capstone.mjs').then(m => m.default());
  return enginePromise;
}

// label -> (arch, mode). Mirrors the ARCHES table in tools/gen_disasm.py exactly, so the CI fixture
// (built with the real Python capstone package) validates every architecture this operation exposes.
const ARCH_SPECS = (C) => ({
  'x86 (64-bit)': [C.CS_ARCH_X86, C.CS_MODE_64],
  'x86 (32-bit)': [C.CS_ARCH_X86, C.CS_MODE_32],
  'x86 (16-bit)': [C.CS_ARCH_X86, C.CS_MODE_16],
  'ARM': [C.CS_ARCH_ARM, C.CS_MODE_ARM],
  'ARM (Thumb)': [C.CS_ARCH_ARM, C.CS_MODE_THUMB],
  'ARM64 (AArch64)': [C.CS_ARCH_ARM64, C.CS_MODE_ARM],
});
const ARCH_NAMES = ['Auto (detect PE / ELF / Mach-O)', 'x86 (64-bit)', 'x86 (32-bit)', 'x86 (16-bit)', 'ARM', 'ARM (Thumb)', 'ARM64 (AArch64)'];

// Accept raw machine code, or a pasted hex string (optionally with 0x, \x, commas, spaces or newlines).
function toBytes(data) {
  const text = decodeLatin1(data).trim();
  if (text && /^(?:0x|\\x|[\s,;:]|[0-9a-fA-F])+$/.test(text)) {
    const hex = text.replace(/0x|\\x|[^0-9a-fA-F]/g, '');
    if (hex.length >= 2 && hex.length % 2 === 0) return Uint8Array.from(hex.match(/../g), h => parseInt(h, 16));
  }
  return data;
}

module('Disassemble',
  'Disassembles machine code into assembly using the Capstone engine (compiled to WebAssembly, running fully offline) — for reading shellcode, a payload pulled out of a document, a code section or a whole binary. '
  + 'Pick the architecture (x86 16/32/64-bit, ARM, ARM Thumb, ARM64), or "Auto" to read it from a PE / ELF / Mach-O header and disassemble that file\'s code (.text) section at its real address. For x86, choose Intel or AT&T syntax. '
  + 'Input may be raw bytes or a pasted hex string (0x, \\x, commas and spaces are ignored), up to 8 MiB. "Max instructions" caps the listing (0 = as many as fit a usable listing); bytes that cannot be decoded are reported at the end.',
  [
    A.select('Architecture', ARCH_NAMES, 'x86 (64-bit)'),
    A.select('x86 syntax', ['Intel', 'AT&T'], 'Intel'),
    A.string('Base address (hex)', '0'),
    A.boolean('Show instruction bytes', true),
    A.number('Max instructions (0 = all)', 4096, 0),
  ],
  async (data, archName, syntax, baseHex, showBytes, maxInstructions = 4096) => {
    const MAX_BYTES = 8 * 1024 * 1024, HARD_MAX_INSNS = 250000;
    let bytes = toBytes(data);
    if (!bytes.length) throw new Error('No input bytes to disassemble');
    let base = BigInt(/^0x/i.test(baseHex.trim()) ? baseHex.trim() : '0x' + (baseHex.trim() || '0').replace(/[^0-9a-fA-F]/g, ''));
    let spec, resolvedName = archName, preamble = '';

    const { Const, disasmBuffer } = await getEngine();
    if (/^Auto/.test(archName)) {
      const info = parseExecutable(bytes);
      if (!info) throw new Error('Auto could not recognise this as a PE, ELF or Mach-O executable. Pick an architecture explicitly for raw machine code.');
      if (!info.disasmArch) throw new Error(`Detected ${info.format} for ${info.arch}, which this build cannot disassemble. Use Detect Executable to inspect it.`);
      if (!info.text || !info.text.size) throw new Error(`Detected ${info.format} (${info.arch}), but could not locate a code (.text) section to disassemble. Use Detect Executable to inspect it.`);
      const end = Math.min(info.text.fileOffset + info.text.size, bytes.length);
      if (info.text.fileOffset >= bytes.length) throw new Error('The code section is past the end of the provided data (the file looks truncated).');
      resolvedName = info.disasmArch;
      base = BigInt(info.text.vaddr || 0);
      preamble = `; ${info.format} ${info.arch} — disassembling the .text section (${end - info.text.fileOffset} bytes) at 0x${base.toString(16)}\n`;
      bytes = bytes.subarray(info.text.fileOffset, end);
    }
    if (bytes.length > MAX_BYTES) throw new Error(`Input is larger than 8 MiB (this offline engine's limit). Extract the region of interest and disassemble that.`);
    spec = ARCH_SPECS(Const)[resolvedName];
    if (!spec) throw new Error(`Unknown architecture: ${resolvedName}`);

    const requested = Math.max(0, Math.trunc(maxInstructions));
    const limit = requested === 0 ? HARD_MAX_INSNS : Math.min(requested, HARD_MAX_INSNS);
    const { insns, bytesConsumed, hitLimit } = disasmBuffer(spec[0], spec[1], bytes, { address: base, attSyntax: spec[0] === Const.CS_ARCH_X86 && /at&t/i.test(syntax), maxInstructions: limit });
    if (!insns.length) throw new Error('Could not disassemble any instruction (wrong architecture, or not machine code?)');

    const addrWidth = Math.max(8, (base + BigInt(bytes.length)).toString(16).length);
    const byteCol = showBytes ? Math.min(20, Math.max(...insns.map(i => i.bytes.length)) * 2) : 0;
    const lines = insns.map(i => {
      const addr = ('0x' + i.address.toString(16)).padEnd(addrWidth + 2);
      const hex = showBytes ? bytesToHex(i.bytes).padEnd(byteCol + 2) : '';
      return `${addr}  ${hex}${i.mnemonic}${i.opStr ? ' ' + i.opStr : ''}`.trimEnd();
    });
    const remaining = bytes.length - bytesConsumed;
    if (hitLimit) lines.push(`; stopped at ${limit} instructions${requested === 0 || requested > HARD_MAX_INSNS ? ' (the maximum for one listing)' : ''}; ${remaining} more byte(s) not shown — raise "Max instructions", or disassemble a smaller region`);
    else if (remaining > 0) { const rest = bytes.subarray(bytesConsumed); lines.push(`; ${remaining} byte(s) could not be disassembled: ${bytesToHex(rest.subarray(0, 32))}${rest.length > 32 ? '…' : ''}`); }
    return preamble + lines.join('\n');
  }, { aliases: ['disassemble', 'disasm', 'capstone', 'shellcode', 'assembly', 'x86', 'arm', 'opcodes', 'pe', 'elf', 'mach-o'] });
