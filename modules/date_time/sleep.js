import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Sleep', 'Pauses the recipe for N milliseconds (max 10 s) and passes the data through.', [A.number('Time (ms)', 1000, 0, 10000)],
  async (data, ms) => { await new Promise(r => setTimeout(r, Math.min(ms, 10000))); return data; },
  { nondeterministic: true });
