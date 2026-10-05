import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('To UNIX Timestamp', 'Parses a date/time string and outputs its UNIX timestamp.', [A.select('Units', ['Seconds (s)', 'Milliseconds (ms)'])],
  (t, units) => { const ms = Date.parse(t.trim()); if (Number.isNaN(ms)) throw new Error(`Could not parse "${t}" as a date/time`); return String(units === 'Seconds (s)' ? Math.floor(ms / 1000) : ms); }, { text: true });
