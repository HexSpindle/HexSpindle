import { module } from './_cat.js';
import { A } from '../../core/registry.js';

// Zero-width characters, the byte-order mark, soft hyphens and bidirectional controls: invisible, and a common way to hide or disguise text.
// Zero-width (non-)joiners are left to a separate switch, because Persian, Arabic and Indic text and many emoji rely on them.
const INVISIBLE = /[​⁠﻿­᠎‎‏‪-‮⁦-⁩]/g;
const JOINERS = /[‌‍]/g;

module('Remove non-printable characters',
  'Removes control characters, and optionally invisible Unicode (zero-width spaces, byte-order marks, soft hyphens and bidirectional overrides) or everything outside printable ASCII. '
  + 'Zero-width joiners and non-joiners have their own switch, because Persian, Arabic and Indic scripts and many emoji need them. Removed characters can be replaced with a marker instead.',
  [A.select('Remove', ['Control characters (keep tabs and line breaks)', 'Control characters, tabs and line breaks', 'Everything outside printable ASCII']),
    A.boolean('Also remove invisible Unicode (zero-width space, BOM, bidi controls)', true), A.boolean('Also remove zero-width joiners / non-joiners', false), A.string('Replace with', '')],
  (t, what, invisible, joiners, replacement) => {
    const control = what === 'Control characters (keep tabs and line breaks)' ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g
      : what === 'Control characters, tabs and line breaks' ? /[\x00-\x1f\x7f-\x9f]/g
        : /[^\x20-\x7e\t\r\n]/gu;
    let out = t.replace(control, () => replacement);
    if (invisible) out = out.replace(INVISIBLE, () => replacement);
    if (joiners) out = out.replace(JOINERS, () => replacement);
    return out;
  }, { text: true, aliases: ['strip control characters', 'control characters', 'non-ascii', 'non printable', 'zero-width', 'invisible characters', 'sanitise', 'sanitize', 'bom'] });
