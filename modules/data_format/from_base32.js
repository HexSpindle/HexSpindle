import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { resolveAlphabet } from '../../core/codec.js';
import { decodeLatin1 } from '../../core/util.js';
import { STD, HEX } from './to_base32.js';

module('From Base32', 'Decodes Base32 data.', [A.combo('Alphabet', [['Standard (RFC 4648): A-Z2-7=', STD], ['Hex Extended (RFC 4648): 0-9A-V=', HEX]]), A.boolean('Remove non-alphabet chars', true)],
  (data, alphabet, remove) => {
    alphabet = resolveAlphabet(alphabet, 32);
    let t = decodeLatin1(data);
    const pad = alphabet[32] || '=';
    if (remove) t = [...t].filter(c => alphabet.includes(c)).join('');
    t = t.replace(new RegExp('\\' + pad + '+$'), '');
    let bits = '';
    for (const c of t) { const idx = alphabet.indexOf(c); if (idx >= 0 && idx < 32) bits += idx.toString(2).padStart(5, '0'); }
    const out = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
    return new Uint8Array(out);
  });
