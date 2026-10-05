import { module } from './_cat.js';

module('SQL Minify', 'Removes comments and collapses whitespace in SQL.', [],
  (t) => {
    const strings = [];
    t = t.replace(/'(?:''|[^'])*'|"[^"]*"/g, (m) => { strings.push(m); return `\0${strings.length - 1}\0`; });
    t = t.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '');
    t = t.replace(/\s+/g, ' ').trim();
    t = t.replace(/\s*([(),=<>])\s*/g, '$1');
    return t.replace(/\0(\d+)\0/g, (_, i) => strings[parseInt(i, 10)]);
  },
  { text: true }
);
