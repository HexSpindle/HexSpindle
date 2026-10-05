import { module } from './_cat.js';

module('Alternating Caps', 'Converts text to AlTeRnAtInG cApS, skipping non-letters.', [],
  (t) => {
    let up = false, out = '';
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (/^\p{L}/u.test(c)) { out += up ? c.toUpperCase() : c.toLowerCase(); up = !up; }
      else out += c;
    }
    return out;
  }, { text: true });
