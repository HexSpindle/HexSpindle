import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { yamlDump, yamlLoad, tomlDump, tomlLoad, iniDump, iniLoad } from './_cfg.js';

const FORMATS = ['YAML', 'TOML', 'INI', 'JSON'];

function load(t, fmt) {
  if (fmt === 'JSON') return JSON.parse(t);
  if (fmt === 'YAML') return yamlLoad(t);
  if (fmt === 'TOML') return tomlLoad(t);
  if (fmt === 'INI') return iniLoad(t);
  throw new Error(fmt);
}

function dump(obj, fmt) {
  if (fmt === 'JSON') return JSON.stringify(obj, null, 2);
  if (fmt === 'YAML') return yamlDump(obj);
  if (fmt === 'TOML') return tomlDump(obj);
  if (fmt === 'INI') return iniDump(obj);
  throw new Error(fmt);
}

module('Convert Config Format', 'Converts between YAML, TOML, INI and JSON.',
  [A.select('From', FORMATS), A.select('To', FORMATS, 'JSON')],
  (t, fin, fout) => dump(load(t, fin), fout), { text: true });
