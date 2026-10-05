import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Unique', 'Removes duplicate lines, keeping the first occurrence of each.', [A.boolean('Case sensitive', true)],
  (t, cs) => { const seen = new Set(); return t.split('\n').filter(l => { const k = cs ? l : l.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).join('\n'); }, { text: true });
