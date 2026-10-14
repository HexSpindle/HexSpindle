import { module } from './_cat.js';
import { parseToml } from './_toml.js';

module('TOML to JSON',
  'Converts TOML (Cargo.toml, pyproject.toml, configuration files) to JSON. Tables, arrays of tables, inline tables, dotted keys and every string and number form are supported; dates and times are kept as strings.',
  [],
  (t) => JSON.stringify(parseToml(t), (k, v) => typeof v === 'number' && !Number.isFinite(v) ? String(v) : v, 2), { text: true, aliases: ['toml2json', 'cargo.toml', 'pyproject'] });
