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
  + 'Input may be raw bytes or a pasted hex string (0x, \\x, commas and spaces are ignored). Bytes that cannot be decoded are reported at the end. '
  + 'This offline engine is sized for code fragments (shellcode, a function, an extracted section) up to 64 KiB; for anything larger, extract the region of interest first. "Max instructions" caps the listing; 0 means decode as much as the engine safely can in one run.',
  [
    A.select('Architecture', ARCH_NAMES, 'x86 (64-bit)'),
    A.select('x86 syntax', ['Intel', 'AT&T'], 'Intel'),
    A.string('Base address (hex)', '0'),
    A.boolean('Show instruction bytes', true),
    A.number('Max instructions (0 = all)', 4096, 0),
  ],
  async (data, archName, syntax, baseHex, showBytes, maxInstructions = 4096) => {
    const bytes = toBytes(data);
    if (!bytes.length) throw new Error('No input bytes to disassemble');
    // Hard limits of this WebAssembly build: the input is marshalled onto the WASM stack (overflows past ~64 KiB),
    // and its ~16 MiB heap OOMs past ~20k decoded instructions. Both are enforced so the engine can never abort.
    const MAX_BYTES = 64 * 1024, SAFE_MAX_INSNS = 16000;
    if (bytes.length > MAX_BYTES) throw new Error(`Input is larger than 64 KiB. This offline Capstone (WebAssembly) build disassembles code fragments up to 64 KiB — extract the region of interest (for example a function, or the executable's code section) and disassemble that.`);
    const requested = Math.max(0, Math.trunc(maxInstructions));
    const effective = requested === 0 ? SAFE_MAX_INSNS : Math.min(requested, SAFE_MAX_INSNS);
    const base = BigInt(/^0x/i.test(baseHex.trim()) ? baseHex.trim() : '0x' + (baseHex.trim() || '0').replace(/[^0-9a-fA-F]/g, ''));
    const { Capstone, Const } = await getEngine();
    const spec = ARCH_SPECS(Const)[archName];
    if (!spec) throw new Error(`Unknown architecture: ${archName}`);
    const cs = new Capstone(spec[0], spec[1]);
    try {
      if (spec[0] === Const.CS_ARCH_X86 && /at&t/i.test(syntax)) cs.setOption(Const.CS_OPT_SYNTAX, Const.CS_OPT_SYNTAX_ATT);
      // Capstone stops after `effective` instructions, bounding both time and memory regardless of input size.
      const insns = cs.disasm(bytes, { address: base, count: effective });
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
      const remaining = bytes.length - consumed;
      if (remaining > 0) {
        if (insns.length >= effective && (requested === 0 || requested > SAFE_MAX_INSNS)) lines.push(`; stopped after ${effective} instructions — the most this offline engine decodes in one run; disassemble a smaller region to read the remaining ${remaining} byte(s)`);
        else if (requested > 0 && insns.length >= requested) lines.push(`; stopped at the ${requested}-instruction limit; ${remaining} more byte(s) not shown — raise "Max instructions", or set it to 0 for all`);
        else { const rest = bytes.subarray(consumed); lines.push(`; ${remaining} byte(s) could not be disassembled: ${bytesToHex(rest.subarray(0, 32))}${rest.length > 32 ? '…' : ''}`); }
      }
      return lines.join('\n');
    } finally {
      cs.close();
    }
  }, { aliases: ['disassemble', 'disasm', 'capstone', 'shellcode', 'assembly', 'x86', 'arm', 'opcodes'] });
