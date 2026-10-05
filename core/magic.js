import { MODULES } from './registry.js';
import { callModule, resolveArgs } from './engine.js';
import { detect } from './filetypes.js';
import { printableRatio, decodeLatin1, encodeUtf8 } from './util.js';

const B64 = /^[A-Za-z0-9+/=_\-\s]{8,}$/;
const HEX = /^(?:0x)?[0-9a-fA-F\s,:\\x]+$/;
const CANDIDATES = [
  ['From Base64', [], B64], ['From Base32', [], /^[A-Z2-7=\s]{8,}$/], ['From Hex', [], HEX], ['From Binary', [], /^[01\s]{8,}$/],
  ['From Decimal', [], /^[\d\s,.-]{4,}$/], ['URL Decode', [], /%[0-9A-Fa-f]{2}/], ['From HTML Entity', [], /&#?\w+;/],
  ['Gunzip', [], null], ['Zlib Inflate', [], null], ['Raw Inflate', [], null],
  ['ROT13', [true, true, false, 13], /[A-Za-z]/], ['ROT47', [47], null], ['Atbash Cipher', [], /[A-Za-z]/], ['From Morse Code', [], /^[.\-/\s_]{5,}$/],
  ['Reverse', ['Character'], null], ['From Charcode', [], /^[0-9a-fA-F\s,]+$/],
];
const WEAK = new Set(['ROT13', 'ROT47', 'Atbash Cipher', 'Reverse']);

function entropy(u8) {
  if (!u8.length) return 0;
  const counts = new Map();
  for (const b of u8) counts.set(b, (counts.get(b) || 0) + 1);
  const n = u8.length;
  let h = 0;
  for (const c of counts.values()) { const p = c / n; h -= p * Math.log2(p); }
  return Math.max(0, h);
}

const COMMON = ['the ', ' and ', ' of ', ' to ', ' is ', 'http', 'flag{', 'ctf{', 'password', 'user', 'hello', '<html', '{"', '-----BEGIN', 'root', 'admin'];

function score(u8) {
  if (!u8.length) return -100;
  const sample = u8.subarray(0, 4096);
  const pr = printableRatio(sample);
  let s = pr * 60;
  if (detect(u8).length) s += 40;
  const low = decodeLatin1(sample).toLowerCase();
  s += Math.min(30, 10 * COMMON.filter(w => low.includes(w)).length);
  const e = entropy(sample);
  if (pr > 0.9) s += Math.max(0, 6 - e) * 2;
  if (pr < 0.7 && !detect(u8).length) s -= 30;
  return Math.round(s * 100) / 100;
}

async function md5hex(u8) {
  const { md5 } = await import('../modules/hashing/md5.js');
  return [...md5(u8)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function search(data, depth = 3, intensive = false, crib = null, beam = 14, limitNodes = 600) {
  const seen = new Set([await md5hex(data)]);
  const root = { data, path: [], score: score(data) };
  let level = [root];
  const results = [root];
  const cribRe = crib ? new RegExp(crib) : null;
  let nodes = 0;
  for (let d = 0; d < depth; d++) {
    const nxt = [];
    for (const { data: cur, path, score: sc } of level) {
      const txt = decodeLatin1(cur.subarray(0, 5000));
      for (const [name, args, rx] of CANDIDATES) {
        const mod = MODULES[name];
        if (!mod) continue;
        if (rx && !rx.test(txt.trim())) continue;
        if (path.length && path[path.length - 1][0] === name && WEAK.has(name) && name !== 'ROT47') continue;
        nodes++;
        let out;
        try { [out] = await callModule(mod, cur, resolveArgs(mod, args, new Map())); }
        catch { continue; }
        if (!out.length || (out.length === cur.length && out.every((b, i) => b === cur[i]))) continue;
        const h = await md5hex(out);
        if (seen.has(h)) continue;
        seen.add(h);
        const newScore = score(out);
        if (WEAK.has(name) && newScore < sc + 8) continue;
        nxt.push({ data: out, path: [...path, [name, args]], score: newScore });
      }
      if (intensive && printableRatio(cur.subarray(0, 200)) < 0.7) {
        for (let k = 1; k < 256; k++) {
          const out = cur.map(c => c ^ k);
          if (printableRatio(out.subarray(0, 200)) > 0.95) {
            const h = await md5hex(out);
            if (!seen.has(h)) { seen.add(h); nxt.push({ data: out, path: [...path, ['XOR', [{ string: k.toString(16).padStart(2, '0'), option: 'Hex' }, 'Standard', false]]], score: score(out) }); }
          }
        }
      }
      if (nodes > limitNodes) break;
    }
    let scored = nxt;
    if (cribRe) scored = scored.map(n => ({ ...n, score: cribRe.test(decodeLatin1(n.data)) ? n.score + 80 : n.score }));
    scored.sort((a, b) => b.score - a.score);
    level = scored.slice(0, beam);
    results.push(...level);
    if (nodes > limitNodes) break;
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}
