import { module } from './_cat.js';
import { base64Decode } from '../../core/util.js';

// Microsoft published this AES-256 key in MS-GPPREF (section 2.2.1.1.4); every domain uses the same one.
const KEY = Uint8Array.from('4e9906e8fcb66cc9faf49310620ffee8f496e806cc057990209b09a433b66c1b'.match(/../g), h => parseInt(h, 16));

export async function decryptCpassword(value) {
  const v = value.trim().replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(v) || v.length < 20) throw new Error('A cpassword is Base64 text of at least one AES block');
  const data = base64Decode(v);   // Group Policy omits the Base64 padding; base64Decode restores it
  if (!data.length || data.length % 16) throw new Error('Decoded cpassword is not a whole number of AES blocks');
  const key = await crypto.subtle.importKey('raw', KEY, 'AES-CBC', false, ['decrypt']);
  let plain;
  try { plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, key, data)); }
  catch { throw new Error('Decryption failed: this is not a Group Policy Preferences cpassword'); }
  return new TextDecoder('utf-16le').decode(plain);
}

module('Group Policy cpassword Decrypt',
  'Decrypts the cpassword attribute found in Group Policy Preferences XML (Groups.xml, Services.xml, ScheduledTasks.xml, Drives.xml and others in SYSVOL). '
  + 'These passwords are AES-256 encrypted with a key Microsoft published, so anyone who can read SYSVOL can recover them (MS14-025). '
  + 'Accepts a bare cpassword or a whole XML file; every cpassword="…" attribute is decrypted.',
  [],
  async (t) => {
    const found = [...t.matchAll(/\bcpassword\s*=\s*"([^"]+)"/gi)];
    if (!found.length) return decryptCpassword(t);
    const lines = [];
    for (const m of found) {
      // Report the account the password belongs to when the same element names one.
      const element = t.slice(t.lastIndexOf('<', m.index), t.indexOf('>', m.index) + 1);
      const user = [...element.matchAll(/\b(?:userName|runAs|accountName|newName)\s*=\s*"([^"]*)"/gi)].map(x => x[1]).find(Boolean);
      let plain; try { plain = await decryptCpassword(m[1]); } catch (e) { plain = `(${e.message})`; }
      lines.push(`${user ? user + ': ' : ''}${plain}`);
    }
    return lines.join('\n');
  }, { text: true, aliases: ['gpp', 'gpp-decrypt', 'groups.xml', 'cpassword', 'ms14-025'] });
