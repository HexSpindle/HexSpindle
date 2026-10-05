import { module } from './_cat.js';
import { strftime, partsFromUtcMs } from './_strptime.js';

module('Parse ObjectID timestamp', 'Extracts the creation time from a MongoDB ObjectID.', [], (t) => {
  t = t.trim();
  if (t.length !== 24) throw new Error('ObjectID must be 24 hex characters');
  const hex8 = t.slice(0, 8);
  if (!/^[0-9a-fA-F]{8}$/.test(hex8)) throw new Error(`invalid literal for int() with base 16: '${hex8}'`);
  return strftime(partsFromUtcMs(parseInt(hex8, 16) * 1000), '%Y-%m-%d %H:%M:%S UTC');
}, { text: true });
