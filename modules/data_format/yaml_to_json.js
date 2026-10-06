import { module } from './_cat.js';
import { yamlLoad } from './_cfg.js';

module('YAML to JSON', 'Converts YAML to JSON.', [], (t) => JSON.stringify(yamlLoad(t), null, 4), { text: true });
