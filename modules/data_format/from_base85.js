import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { resolveAlphabet } from '../../core/codec.js';
import { decodeLatin1 } from '../../core/util.js';
import { PRESETS, STD } from './to_base85.js';

export function genericDecode(t, alphabet) {
  const idx = new Map([...alphabet].map((c, i) => [c, i]));
  const pad = (5 - (t.length % 5)) % 5;
  t += alphabet[84].repeat(pad);
  const out = [];
  for (let i = 0; i < t.length; i += 5) {
    let n = 0;
    for (const c of t.slice(i, i + 5)) {
      if (!idx.has(c)) throw new Error(`Character not in alphabet: ${JSON.stringify(c)}`);
      n = n * 85 + idx.get(c);
    }
    out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
  }
  return new Uint8Array(pad ? out.slice(0, out.length - pad) : out);
}

export function a85Decode(t) {
  const idx = new Map([...STD].map((c, i) => [c, i]));
  const out = [];
  let group = [];
  const flush = (g, isFinal) => {
    const pad = isFinal ? 5 - g.length : 0;
    let n = 0;
    const full = g.concat(new Array(pad).fill(84));
    for (const d of full) n = n * 85 + d;
    const bytes = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    out.push(...bytes.slice(0, 4 - pad));
  };
  for (const c of t) {
    if (group.length === 0 && c === 'z') { out.push(0, 0, 0, 0); continue; }
    if (!idx.has(c)) throw new Error(`Character not in alphabet: ${JSON.stringify(c)}`);
    group.push(idx.get(c));
    if (group.length === 5) { flush(group, false); group = []; }
  }
  if (group.length === 1) throw new Error('Invalid Ascii85 data');
  if (group.length) flush(group, true);
  return new Uint8Array(out);
}

module('From Base85', 'Decodes Base85 / Ascii85 data.',
  [A.combo('Alphabet', PRESETS), A.boolean('Remove non-alphabet chars', true)],
  (data, alphabet, remove) => {
    alphabet = resolveAlphabet(alphabet, 85);
    let t = decodeLatin1(data).trim();
    if (alphabet === STD) {
      if (t.startsWith('<~')) t = t.slice(2);
      if (t.endsWith('~>')) t = t.slice(0, -2);
      t = t.replace(/\s+/g, '');
      return a85Decode(t);
    }
    if (remove) t = [...t].filter(c => alphabet.includes(c)).join('');
    return genericDecode(t, alphabet);
  });
