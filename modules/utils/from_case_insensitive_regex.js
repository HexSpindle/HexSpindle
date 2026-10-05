import { module } from './_cat.js';

module('From Case Insensitive Regex', 'Collapses [aA]-style per-letter character classes back into plain letters (the inverse of To Case Insensitive Regex).', [],
  (t) => t.replace(/\[([A-Za-z]{2})\]/g, (m, pair) => pair[0].toLowerCase() === pair[1].toLowerCase() ? pair[0].toLowerCase() : m), { text: true });
