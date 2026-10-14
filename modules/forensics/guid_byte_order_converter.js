import { module } from './_cat.js';

const format = h => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
const flip = h => (h.match(/../g) || []).reverse().join('');
// Windows stores the first three fields little-endian and the last two as written.
const swap = h => flip(h.slice(0, 8)) + flip(h.slice(8, 12)) + flip(h.slice(12, 16)) + h.slice(16);
const spaced = h => h.match(/../g).join(' ');

function describeVersion(h) {
  const version = parseInt(h[12], 16), variant = parseInt(h[16], 16);
  const kind = variant >= 8 && variant <= 0xb ? 'RFC 4122' : variant >= 0xc && variant <= 0xd ? 'Microsoft (legacy)' : variant < 8 ? 'NCS (legacy)' : 'reserved';
  const names = { 1: 'time and MAC address', 2: 'DCE security', 3: 'name-based (MD5)', 4: 'random', 5: 'name-based (SHA-1)', 6: 'reordered time', 7: 'Unix time and random', 8: 'custom' };
  return kind === 'RFC 4122' ? `version ${version}${names[version] ? ` (${names[version]})` : ''}, ${kind} variant` : `${kind} variant`;
}

module('GUID Byte Order Converter',
  'Converts a GUID between its text form and the bytes Windows actually stores. Windows writes the first three fields little-endian, so the GUID {00112233-4455-6677-8899-aabbccddeeff} '
  + 'appears on disk, in the registry and in network captures as 33 22 11 00 55 44 77 66 88 99 aa bb cc dd ee ff. Give a GUID to get both byte layouts, or 16 bytes of hex to see the GUID under each reading. One value per line.',
  [],
  (t) => {
    const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) throw new Error('No GUID in the input');
    return lines.map(line => {
      const guid = /^[{(]?([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})[})]?$/i.exec(line);
      if (guid) {
        const h = guid.slice(1).join('').toLowerCase();
        return [`GUID:                              ${format(h)}  (${describeVersion(h)})`, `Windows byte order (mixed-endian): ${spaced(swap(h))}`, `Network byte order (big-endian):   ${spaced(h)}`,
          `As a C byte array (Windows):       { ${swap(h).match(/../g).map(b => '0x' + b).join(', ')} }`].join('\n');
      }
      const h = line.replace(/\\x|0x|[\s,:{}-]/gi, '').toLowerCase();
      if (!/^[0-9a-f]{32}$/.test(h)) throw new Error(`Expected a GUID or 16 bytes of hex: ${line.slice(0, 60)}`);
      return [`Bytes:                                  ${spaced(h)}`, `If stored by Windows (mixed-endian):    ${format(swap(h))}  (${describeVersion(swap(h))})`,
        `If in network order (big-endian, RFC):  ${format(h)}  (${describeVersion(h)})`].join('\n');
    }).join('\n\n');
  }, { text: true, aliases: ['guid', 'uuid bytes', 'clsid', 'mixed endian', 'objectguid'] });
