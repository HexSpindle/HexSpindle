import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const SMART_MAP = {
  '“': '"', '”': '"', '„': '"', '‟': '"', '″': '"',
  '‘': "'", '’': "'", '‚': "'", '‛': "'", '′': "'",
  '‐': '-', '‑': '-', '‒': '-', '–': '-', '—': '--', '―': '--',
  '…': '...',
  '©': '(c)', '®': '(r)', '™': '(tm)',
  '←': '<--', '→': '-->', '↑': '^', '↓': 'v', '↔': '<->',
  '⇐': '<==', '⇒': '==>', '⇔': '<=>',
  '«': '<<', '»': '>>', '‹': '<', '›': '>',
  '×': 'x', '÷': '/', '±': '+/-', '•': '*', '·': '.',
  ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ',
};

module('Escape Smart Characters', "Converts smart (typographic) Unicode characters - e.g. smart quotes, em/en dashes, ellipses, ©, ®, ™, arrows - into their plain ASCII equivalents. Characters with no ASCII mapping (e.g. ☣) are handled according to the 'Unmappable characters' option. e.g. “Hello” — world… becomes \"Hello\" -- world...",
  [A.select('Unmappable characters', ['Include', 'Remove', "Replace with '.'"])],
  (t, unmappable) => {
    let result = '';
    for (const ch of t) {
      if (ch.codePointAt(0) < 128) { result += ch; continue; }
      if (Object.prototype.hasOwnProperty.call(SMART_MAP, ch)) { result += SMART_MAP[ch]; continue; }
      if (unmappable === 'Remove') continue;
      if (unmappable === "Replace with '.'") { result += '.'; continue; }
      result += ch;
    }
    return result;
  }, { text: true });
