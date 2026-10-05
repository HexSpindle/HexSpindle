import { module } from './_cat.js';

module('From Hexdump', 'Extracts the bytes from a hexdump (offset and ASCII columns are stripped).', [],
  (t) => {
    const hasPipe = t.includes('|');
    const out = [];
    for (let line of t.split(/\r\n|\r|\n/)) {
      line = line.replace(/\|.*\|\s*$/, '');
      line = line.replace(/^\s*[0-9a-fA-F]{4,}:?\s+/, '');
      if (!hasPipe) line = line.replace(/\s{3,}.*$/, '');
      const toks = line.match(/\b[0-9a-fA-F]{2}\b/g) || [];
      for (const tok of toks) out.push(parseInt(tok, 16));
    }
    return new Uint8Array(out);
  }, { text: true });
