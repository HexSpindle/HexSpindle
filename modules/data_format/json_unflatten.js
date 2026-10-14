import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('JSON Unflatten',
  'Rebuilds nested JSON from an object whose keys are paths, the reverse of JSON Flatten: {"a.b[0]":1,"a.b[1]":2} becomes {"a":{"b":[1,2]}}. '
  + 'Bracketed numbers always mean array positions; with "Dotted numbers are array indexes" a path such as a.0 does too.',
  [A.string('Separator', '.'), A.boolean('Dotted numbers are array indexes', false)],
  (t, sep, dotted) => {
    if (!sep) throw new Error('Separator must not be empty');
    const flat = JSON.parse(t);
    if (!flat || typeof flat !== 'object' || Array.isArray(flat)) throw new Error('Expected a flat JSON object of path: value pairs');
    // A path is a list of steps; a numeric step selects an array position.
    const steps = key => key.split(sep).flatMap(part => {
      const out = [], m = /^([^[\]]*)((?:\[\d+\])*)$/.exec(part);
      if (!m) return [{ key: part }];
      if (m[1] !== '' || !m[2]) out.push(dotted && /^\d+$/.test(m[1]) ? { index: +m[1] } : { key: m[1] });
      for (const n of m[2].matchAll(/\[(\d+)\]/g)) out.push({ index: +n[1] });
      return out;
    });
    let root;
    for (const [key, value] of Object.entries(flat)) {
      const path = key === '' ? [] : steps(key);
      if (!path.length) { root = value; continue; }
      if (root === undefined) root = 'index' in path[0] ? [] : {};
      let node = root;
      path.forEach((step, i) => {
        const name = 'index' in step ? step.index : step.key;
        if (Array.isArray(node) !== ('index' in step)) throw new Error(`"${key}" uses ${'index' in step ? 'an array index' : 'a key'} where other paths use ${Array.isArray(node) ? 'an array' : 'an object'}`);
        if (i === path.length - 1) { node[name] = value; return; }
        if (node[name] === undefined || node[name] === null || typeof node[name] !== 'object') node[name] = 'index' in path[i + 1] ? [] : {};
        node = node[name];
      });
    }
    return JSON.stringify(root === undefined ? {} : root, null, 2);
  }, { text: true, aliases: ['unflatten', 'expand paths'] });
