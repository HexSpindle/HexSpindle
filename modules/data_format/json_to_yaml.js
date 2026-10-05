import { module } from './_cat.js';
import { yamlDump } from './_cfg.js';

module('JSON to YAML', 'Converts JSON to YAML.', [], (t) => yamlDump(JSON.parse(t)), { text: true });
