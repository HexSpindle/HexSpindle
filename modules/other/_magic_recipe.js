// Runs operations suggested by _magic_lib.mjs through HexSpindle's own implementations.
import { MODULES } from '../../core/registry.js';
import { resolveArgs, callModule } from '../../core/engine.js';

function expandAlph(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (i < s.length - 2 && s[i + 1] === '-' && s[i] !== '\\') {
      for (let j = s.codePointAt(i); j <= s.codePointAt(i + 2); j++) out.push(String.fromCodePoint(j));
      i += 2;
    } else if (i < s.length - 2 && s[i] === '\\' && s[i + 1] === '-') {
      out.push('-'); i++;
    } else out.push(s[i]);
  }
  return out.join('');
}

function ccBytesToStr(u8) {
  if (!u8.length) return '';
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch { /* not UTF-8 */ }
  let s = '';
  for (let i = 0; i < u8.length; i += 20000) s += String.fromCharCode(...u8.subarray(i, i + 20000));
  return s;
}
function ccStrToBytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 255) return new TextEncoder().encode(s);
    out[i] = c;
  }
  return out;
}

let cpPromise = null;
const loadCodepage = () => (cpPromise ??= import('./_codepage.mjs'));
const NATIVE = {
  async 'Encode text'(data, [enc]) {
    const { cptable, CHR_ENC_CODE_PAGES } = await loadCodepage();
    const format = CHR_ENC_CODE_PAGES[enc];
    if (!format) throw new Error('Invalid encoding');
    return new Uint8Array(cptable.utils.encode(format, ccBytesToStr(data)));
  },
  async 'Decode text'(data, [enc]) {
    const { cptable, CHR_ENC_CODE_PAGES } = await loadCodepage();
    const format = CHR_ENC_CODE_PAGES[enc];
    if (!format) throw new Error('Invalid encoding');
    return ccStrToBytes(cptable.utils.decode(format, data));
  },
};

const ADAPT = {
  'From Base64': a => ['From Base64', [expandAlph(a[0]), a[1], a[2]]],
  'From Base32': a => ['From Base32', [expandAlph(a[0]), a[1]]],
  'From Base58': a => ['From Base58', [a[0], a[1]]],
  'From Base85': a => ['From Base85', [expandAlph(a[0])]],
  'From Bech32': a => {
    if (a[1] !== 'Hex') throw new Error('Unsupported Bech32 output format');
    return ['From Bech32', ['Hex']];
  },
  'From Morse Code': a => ['From Morse Code', [undefined, a[0], a[1]]],
  'Decode NetBIOS Name': () => ['Decode NetBIOS Name', []],
  'From Modhex': () => ['From Modhex', []],
  'Bzip2 Decompress': () => ['Bzip2 Decompress', []],
  'Raw Inflate': () => ['Raw Inflate', []],
  'Zlib Inflate': () => ['Zlib Inflate', []],
  'Unzip': () => ['Unzip', []],
  'Untar': () => ['Untar', []],
  'URL Decode': () => ['URL Decode', []],
  'PEM to JWK': () => ['PEM to JWK', []],
  'JWT Decode': () => ['JWT Decode', []],
  'Parse CSR': () => ['Parse CSR', []],
  'Parse X.509 CRL': () => ['Parse X.509 CRL', []],
  'Parse SSH Host Key': () => ['Parse SSH Host Key', []],
};

export default class Recipe {
  constructor(config = []) {
    this.opList = config.map(c => ({ name: c.op, args: c.args || [] }));
    this.lastRunOp = null;
  }

  async execute(dish) {
    let data = new Uint8Array(await dish.get());
    for (const op of this.opList) {
      if (NATIVE[op.name]) {
        data = await NATIVE[op.name](data, op.args);
      } else {
        const [name, args] = (ADAPT[op.name] || (a => [op.name, a]))(op.args);
        const mod = MODULES[name];
        if (!mod) throw new Error(`No HexSpindle operation ${name}`);
        const res = await mod.func(mod.text ? ccBytesToStr(data) : data, ...resolveArgs(mod, args, new Map()));
        data = typeof res === 'string' || res instanceof String ? ccStrToBytes(String(res))
          : res instanceof Uint8Array ? res
          : res instanceof ArrayBuffer ? new Uint8Array(res)
          : (await callModule({ text: false, func: () => res }, data, []))[0];
      }
      this.lastRunOp = op;
    }
    dish.set(data);
  }
}
