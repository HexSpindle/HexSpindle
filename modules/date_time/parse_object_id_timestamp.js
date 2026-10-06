import { module } from './_cat.js';

module('Parse ObjectID timestamp', 'Extracts the creation time from a MongoDB ObjectID.', [], (t) => {
  t = t.trim();
  if (!/^[0-9a-fA-F]{24}$/.test(t)) throw new Error('BSONError: input must be a 24 character hex string, 12 byte Uint8Array, or an integer');
  return new Date(parseInt(t.slice(0, 8), 16) * 1000).toISOString();
}, { text: true });
