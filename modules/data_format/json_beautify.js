import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('JSON Beautify', 'Pretty-prints JSON with indentation.', [A.number('Indent size', 4, 0, 8)],
  (t, indent) => (t ? JSON.stringify(JSON.parse(t), null, indent) : ''), { text: true });
