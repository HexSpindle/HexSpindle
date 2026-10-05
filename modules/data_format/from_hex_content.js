import { module } from './_cat.js';
import { decodeLatin1 } from '../../core/util.js';

module('From Hex Content', 'Converts Snort/Suricata-style |hex| content back to bytes.', [],
  (data) => {
    const t = decodeLatin1(data);
    const out = t.replace(/\|([0-9a-fA-F\s]*)\|/g, (_, g) => {
      const hex = g.replace(/\s+/g, '');
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
      return String.fromCharCode(...bytes);
    });
    return new Uint8Array([...out].map(c => c.charCodeAt(0) & 0xff));
  });
