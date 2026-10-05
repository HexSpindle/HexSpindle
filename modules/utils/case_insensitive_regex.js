import { module } from './_cat.js';

module('To Case Insensitive Regex', "Rewrites a regex so each letter becomes a [aA] character class, making it case-insensitive without the (?i) flag (for engines/contexts that don't support inline flags).", [],
  (t) => t.replace(/[A-Za-z]/g, c => `[${c.toLowerCase()}${c.toUpperCase()}]`), { text: true });
