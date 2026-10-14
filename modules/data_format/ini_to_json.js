import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const typed = v => v === 'true' ? true : v === 'false' ? false : /^-?(?:0|[1-9]\d{0,14})(?:\.\d+)?$/.test(v) ? Number(v) : v;

module('INI to JSON',
  'Converts INI-style configuration (also .conf, .cfg, desktop.ini, php.ini, systemd units, .gitconfig) to JSON. [Sections] become objects, keys before the first section stay at the top level, '
  + 'lines starting with ; or # are comments, and a key that repeats becomes an array.',
  [A.boolean('Convert numbers and true / false', false), A.boolean('Split dotted section names into nested objects', false)],
  (t, convert, nest) => {
    const root = {};
    let section = root;
    for (const [n, raw] of t.split(/\r?\n/).entries()) {
      const line = raw.trim();
      if (!line || line[0] === ';' || line[0] === '#') continue;
      const header = /^\[(.+)\]$/.exec(line);
      if (header) {
        section = root;
        for (const part of nest ? header[1].split('.') : [header[1]]) { const name = part.trim(); if (typeof section[name] !== 'object' || section[name] === null || Array.isArray(section[name])) section[name] = {}; section = section[name]; }
        continue;
      }
      const eq = line.search(/[=:]/);
      // A bare word is a flag; anything else without a separator is a mistake worth reporting.
      if (eq < 0) { if (/^[\w.-]+$/.test(line)) { section[line] = true; continue; } throw new Error(`INI line ${n + 1} has no "=": ${line.slice(0, 60)}`); }
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      const quoted = /^(["'])(.*)\1$/.exec(value);
      if (quoted) value = quoted[2]; else value = value.replace(/\s+[;#].*$/, '');
      const v = convert && !quoted ? typed(value) : value;
      if (key in section) section[key] = Array.isArray(section[key]) ? [...section[key], v] : [section[key], v]; else section[key] = v;
    }
    return JSON.stringify(root, null, 2);
  }, { text: true, aliases: ['ini2json', 'conf', 'cfg', 'config file'] });
