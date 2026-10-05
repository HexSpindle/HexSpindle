import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex } from '../../core/util.js';
import { toPem } from './_pem.js';

module('Hex to PEM', 'Wraps hex data as PEM with the given header label.', [A.string('Header string', 'CERTIFICATE')],
  (t, label) => toPem(parseHex(t), label), { text: true });
