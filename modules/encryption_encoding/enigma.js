import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const ROTORS = {
  I: ['EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'Q'], II: ['AJDKSIRUXBLHWTMCQGZNPYFVOE', 'E'], III: ['BDFHJLCPRTXVZNYEIWGAKMUSQO', 'V'],
  IV: ['ESOVPZJAYQUIRHXLNFTGKDCMWB', 'J'], V: ['VZBRGITYUPSDNHLXAWMJQOFECK', 'Z'], VI: ['JPGVOUMFYQBENHZRDKASXLICTW', 'ZM'],
  VII: ['NZJHGRCXMYSWBOUFAIVLPEKQDT', 'ZM'], VIII: ['FKQHTLXOCBJSPDZRAMEWNIUYGV', 'ZM'], Beta: ['LEYJVCNIXWPBQMDRTAKZGFUHOS', ''], Gamma: ['FSOKANUERHMBTIYCWLQPZXVGJD', ''],
};
const REFLECTORS = {
  B: 'YRUHQSLDPXNGOKMIEBFZCWVJAT', C: 'FVPJIAOYEDRZXWGCTKUQSBNMHL', A: 'EJMZALYXVBWFCRQUONTSPIKHGD',
  'B-thin': 'ENKQAUYWJICOPBLMDXZVFTHRGS', 'C-thin': 'RDOBJNTKVEHMLFCWZAXGYIPSUQ',
};
const A_ = 65;

function parsePlug(s) {
  const m = {};
  const pairs = s.toUpperCase().match(/[A-Z]{2}/g) || [];
  for (const pair of pairs) {
    const a = pair[0], b = pair[1];
    if (a in m || b in m || a === b) throw new Error(`Invalid plugboard pair ${pair}`);
    m[a] = b; m[b] = a;
  }
  return m;
}

module('Enigma', 'Simulates the Enigma machine (M3 / M4). Rotor lists are left to right as seen: slowest first.',
  [A.select('Reflector', Object.keys(REFLECTORS)), A.string('Rotors (slow→fast)', 'I II III', 'Roman numerals / Beta / Gamma separated by spaces'),
   A.string('Ring settings', 'A A A'), A.string('Start positions', 'A A A'), A.string('Plugboard', '', 'e.g. AB CD EF'), A.boolean('Strict output (letters only)', true)],
  (t, refl, rotors, ringsS, startsS, plug, strict) => {
    const names = rotors.split(/\s+/).filter(Boolean);
    const rings = ringsS.split(/\s+/).filter(Boolean).map(c => c.toUpperCase().charCodeAt(0) - A_);
    const pos = startsS.split(/\s+/).filter(Boolean).map(c => c.toUpperCase().charCodeAt(0) - A_);
    if (!(names.length === rings.length && rings.length === pos.length) || ![3, 4].includes(names.length)) {
      throw new Error('Rotors, ring settings and start positions need 3 (or 4) entries each');
    }
    const wiring = names.map(n => [...ROTORS[n][0]].map(c => c.charCodeAt(0) - A_));
    const inv = wiring.map(w => { const r = new Array(26); for (let i = 0; i < 26; i++) r[w[i]] = i; return r; });
    const notches = names.map(n => [...ROTORS[n][1]].map(c => c.charCodeAt(0) - A_));
    const rf = [...REFLECTORS[refl]].map(c => c.charCodeAt(0) - A_);
    const pb = parsePlug(plug);
    const n = names.length;
    const out = [];
    for (const ch of t) {
      const u = ch.toUpperCase();
      if (!(u >= 'A' && u <= 'Z')) {
        if (!strict) out.push(ch);
        continue;
      }
      const r = n - 1, m = n - 2, l = n - 3;
      if (notches[m].includes(pos[m])) {
        pos[m] = (pos[m] + 1) % 26;
        pos[l] = (pos[l] + 1) % 26;
      } else if (notches[r].includes(pos[r])) {
        pos[m] = (pos[m] + 1) % 26;
      }
      pos[r] = (pos[r] + 1) % 26;
      let x = (pb[u] ? pb[u].charCodeAt(0) : u.charCodeAt(0)) - A_;
      for (let i = n - 1; i >= 0; i--) {
        const s = ((pos[i] - rings[i]) % 26 + 26) % 26;
        x = (((wiring[i][(x + s) % 26] - s) % 26) + 26) % 26;
      }
      x = rf[x];
      for (let i = 0; i < n; i++) {
        const s = ((pos[i] - rings[i]) % 26 + 26) % 26;
        x = (((inv[i][(x + s) % 26] - s) % 26) + 26) % 26;
      }
      let c = String.fromCharCode(x + A_);
      c = pb[c] || c;
      out.push((ch === ch.toUpperCase() || strict) ? c : c.toLowerCase());
    }
    return out.join('');
  }, { text: true });
