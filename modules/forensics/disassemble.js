import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1, bytesToHex } from '../../core/util.js';

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
const ARCH_NAMES = ['x86 (64-bit)', 'x86 (32-bit)', 'x86 (16-bit)', 'ARM', 'ARM (Thumb)', 'ARM64 (AArch64)'];

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
  'Disassembles raw machine code into assembly using the Capstone engine (compiled to WebAssembly, running fully offline) — for reading shellcode, a payload pulled out of a document, or a code snippet. '
  + 'Choose the architecture (x86 16/32/64-bit, ARM, ARM Thumb, ARM64) and, for x86, Intel or AT&T syntax. '
  + 'Input may be raw bytes or a pasted hex string (0x, \\x, commas and spaces are ignored). Bytes that cannot be decoded are reported at the end.',
  [
    A.select('Architecture', ARCH_NAMES, 'x86 (64-bit)'),
    A.select('x86 syntax', ['Intel', 'AT&T'], 'Intel'),
    A.string('Base address (hex)', '0'),
    A.boolean('Show instruction bytes', true),
  ],
  async (data, archName, syntax, baseHex, showBytes) => {
    const bytes = toBytes(data);
    if (!bytes.length) throw new Error('No input bytes to disassemble');
    if (bytes.length > 1 << 20) throw new Error('Input is larger than 1 MiB; disassemble a smaller region');
    const base = BigInt(/^0x/i.test(baseHex.trim()) ? baseHex.trim() : '0x' + (baseHex.trim() || '0').replace(/[^0-9a-fA-F]/g, ''));
    const { Capstone, Const } = await getEngine();
    const spec = ARCH_SPECS(Const)[archName];
    if (!spec) throw new Error(`Unknown architecture: ${archName}`);
    const cs = new Capstone(spec[0], spec[1]);
    try {
      if (spec[0] === Const.CS_ARCH_X86 && /at&t/i.test(syntax)) cs.setOption(Const.CS_OPT_SYNTAX, Const.CS_OPT_SYNTAX_ATT);
      const insns = cs.disasm(bytes, { address: base });
      if (!insns.length) throw new Error('Could not disassemble any instruction (wrong architecture, or not machine code?)');
      const addrWidth = Math.max(8, ((base + BigInt(bytes.length)).toString(16).length));
      const byteCol = showBytes ? Math.min(20, Math.max(...insns.map(i => i.size)) * 2) : 0;
      let consumed = 0;
      const lines = insns.map(i => {
        consumed += i.size;
        const addr = ('0x' + (typeof i.address === 'bigint' ? i.address : BigInt(i.address)).toString(16)).padEnd(addrWidth + 2);
        const hex = showBytes ? bytesToHex(i.bytes).padEnd(byteCol + 2) : '';
        return `${addr}  ${hex}${i.mnemonic}${i.opStr ? ' ' + i.opStr : ''}`.trimEnd();
      });
      if (consumed < bytes.length) {
        const rest = bytes.subarray(consumed);
        lines.push(`; ${bytes.length - consumed} byte(s) could not be disassembled: ${bytesToHex(rest.subarray(0, 32))}${rest.length > 32 ? '…' : ''}`);
      }
      return lines.join('\n');
    } finally {
      cs.close();
    }
  }, { aliases: ['disassemble', 'disasm', 'capstone', 'shellcode', 'assembly', 'x86', 'arm', 'opcodes'] });
