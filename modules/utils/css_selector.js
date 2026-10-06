import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';
import { xmldomToString } from './_xmldom_serialize.js';

module('CSS selector', 'Extracts elements from HTML/XML with a CSS selector.', [A.string('CSS selector', ''), A.string('Delimiter', '\\n')],
  (t, sel, d) => {
    if (!sel.length || !t.length) return '';
    const doc = new DOMParser().parseFromString(t, 'text/html');
    let els;
    try { els = doc.querySelectorAll(sel); }
    catch (e) { throw new Error('Invalid CSS Selector. Details:\n' + e.message); }
    return [...els].map(e => xmldomToString(e, { plain: true })).join(delim(d));
  }, { text: true });
