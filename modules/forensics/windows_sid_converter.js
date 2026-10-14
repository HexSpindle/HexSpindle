import { module } from './_cat.js';
import { parseHex, base64Decode, base64Encode } from '../../core/util.js';
import { sidToBytes, bytesToSid, sidName, authorityName, hexOf } from './_windows_ids.js';

function describe(sid) {
  const bytes = sidToBytes(sid), parts = sid.split('-'), subs = parts.slice(3);
  const lines = [`SID:            ${sid}`, `Name:           ${sidName(sid) || 'not a well-known identifier'}`,
    `Authority:      ${parts[2]}${authorityName(+parts[2]) ? ` (${authorityName(+parts[2])})` : ''}`, `Sub-authorities: ${subs.length ? subs.join(', ') : 'none'}`];
  if (/^S-1-5-21-\d+-\d+-\d+-\d+$/.test(sid)) lines.push(`Domain SID:     ${parts.slice(0, 7).join('-')}`, `RID:            ${subs[subs.length - 1]}`);
  lines.push(`Binary (hex):   ${hexOf(bytes)}`, `Binary (Base64): ${base64Encode(bytes)}`, `LDAP filter:    (objectSid=${[...bytes].map(b => '\\' + b.toString(16).padStart(2, '0')).join('')})`);
  return lines.join('\n');
}

module('Windows SID Converter',
  'Converts Windows security identifiers between text (S-1-5-21-…) and their binary form, as found in registry values, event logs, NTFS security descriptors and the Active Directory objectSid attribute (hex or Base64). '
  + 'Explains each SID: authority, sub-authorities, domain part and RID, and the name of well-known accounts and groups. One value per line.',
  [],
  (t) => {
    const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) throw new Error('No SID in the input');
    return lines.map(line => {
      if (/^S-\d+-/i.test(line)) return describe(line.toUpperCase());
      const compact = line.replace(/\\x|0x|[\s,:-]/gi, '');
      // Hex is tried first: a binary SID starts with 01 and its length is fixed by its second byte.
      const bytes = /^[0-9a-fA-F]+$/.test(compact) && compact.length % 2 === 0 && compact.length >= 16 && /^01/.test(compact) ? parseHex(compact) : base64Decode(line);
      return describe(bytesToSid(bytes).sid);
    }).join('\n\n');
  }, { text: true, aliases: ['sid', 'objectsid', 'security identifier', 'rid'] });
