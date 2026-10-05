import { module } from './_cat.js';

module('Decode NetBIOS Name', 'Decodes a NetBIOS first-level encoded name (each nibble mapped to A-P) back to ASCII.', [],
  (t) => {
    const s = t.trim().toUpperCase();
    if (s.length % 2 || [...s].some(c => c < 'A' || c > 'P')) throw new Error('Expected a string of even length using only letters A-P');
    let out = '';
    for (let i = 0; i < s.length; i += 2) {
      const hi = s.charCodeAt(i) - 65, lo = s.charCodeAt(i + 1) - 65;
      out += String.fromCharCode((hi << 4) | lo);
    }
    return out.replace(/[\x00 ]+$/, '');
  }, { text: true });
