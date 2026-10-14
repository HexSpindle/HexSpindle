import { module } from './_cat.js';
import { stringifyToml } from './_toml.js';

module('JSON to TOML',
  'Converts a JSON object to TOML. Nested objects become [tables], arrays of objects become [[arrays of tables]], and other arrays are written inline. TOML has no null, so null values are rejected.',
  [],
  (t) => stringifyToml(JSON.parse(t)), { text: true, aliases: ['json2toml'] });
