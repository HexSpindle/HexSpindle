import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

module('CSS selector', 'Extracts elements from HTML/XML with a CSS selector.', [A.string('CSS selector', ''), A.string('Delimiter', '\\n')],
  (t, sel, d) => {
    const doc = new DOMParser().parseFromString(t, 'text/html');
    const els = doc.querySelectorAll(sel);
    return [...els].map(e => e.outerHTML).join(delim(d));
  }, { text: true });
