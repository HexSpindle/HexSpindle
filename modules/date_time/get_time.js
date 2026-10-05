import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Get Time', 'Outputs the current UNIX time (ignores the input).', [A.select('Granularity', ['Seconds (s)', 'Milliseconds (ms)'])],
  (t, g) => String(g === 'Seconds (s)' ? Math.floor(Date.now() / 1000) : Date.now()), { text: true, nondeterministic: true });
