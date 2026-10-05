import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Remove whitespace', 'Removes selected kinds of whitespace.',
  [A.boolean('Spaces', true), A.boolean('Carriage returns (\\r)', true), A.boolean('Line feeds (\\n)', true),
   A.boolean('Tabs', true), A.boolean('Form feeds (\\f)', true), A.boolean('Full stops', false)],
  (t, sp, cr, lf, tab, ff, fs) => {
    const rm = (sp ? ' ' : '') + (cr ? '\r' : '') + (lf ? '\n' : '') + (tab ? '\t' : '') + (ff ? '\f' : '') + (fs ? '.' : '');
    if (!rm) return t;
    const re = new RegExp(`[${rm.replace(/[.\\^$*+?()[\]{}|]/g, '\\$&')}]`, 'g');
    return t.replace(re, '');
  }, { text: true });
