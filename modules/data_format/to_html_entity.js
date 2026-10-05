import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ENTITY_NAMES } from './_html_entities.js';

module('To HTML Entity', 'Converts characters to HTML entities.', [A.boolean('Convert all characters', false), A.select('Convert to', ['Named entities', 'Numeric entities', 'Hex entities'])],
  (t, all, kind) => {
    const numeric = kind === 'Numeric entities', hexa = kind === 'Hex entities';
    let out = '';
    for (const ch of t) {
      const c = ch.codePointAt(0);
      const named = c in ENTITY_NAMES ? `&${ENTITY_NAMES[c]};` : null;
      const hex = `&#x${c.toString(16).padStart(2, '0')};`;
      if (all && numeric) out += `&#${c};`;
      else if (all && hexa) out += hex;
      else if (all) out += named || `&#${c};`;
      else if (numeric) out += (c > 255 || named) ? `&#${c};` : ch;
      else if (hexa) out += (c > 255 || named) ? hex : ch;
      else out += named || (c > 255 ? `&#${c};` : ch);
    }
    return out;
  }, { text: true });
