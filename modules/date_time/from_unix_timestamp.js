import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('From UNIX Timestamp', 'Converts a UNIX timestamp to an ISO 8601 date/time string (UTC).', [A.select('Units', ['Seconds (s)', 'Milliseconds (ms)'])],
  (t, units) => { const n = Number(t.trim()); if (Number.isNaN(n)) throw new Error(`"${t}" is not a number`); return new Date(units === 'Seconds (s)' ? n * 1000 : n).toISOString(); }, { text: true });
