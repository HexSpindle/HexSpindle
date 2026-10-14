import { module } from './_cat.js';
import { parseHex, decodeLatin1 } from '../../core/util.js';
import { desDecryptBlock } from './_des.js';

// VNC stores passwords DES-encrypted with one hard-coded key. VNC also feeds each key byte to DES
// bit-reversed, so the key as DES sees it is the mirror image of the published one (17 52 6b 06 23 4e 58 07).
const KEY = Uint8Array.from([0x17, 0x52, 0x6b, 0x06, 0x23, 0x4e, 0x58, 0x07], b => { let r = 0; for (let i = 0; i < 8; i++) r |= ((b >> i) & 1) << (7 - i); return r; });

export function decryptVncPassword(hex) {
  const clean = hex.replace(/^.*?[=:]\s*/, '').replace(/hex:|0x|[\s,"]/gi, '');
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length < 16) throw new Error('Expected the stored password as 16 hex characters (8 bytes)');
  const block = parseHex(clean).subarray(0, 8);
  return decodeLatin1(desDecryptBlock(block, KEY)).replace(/\0+$/, '');
}

module('VNC Password Decrypt',
  'Decrypts a stored VNC password (RealVNC, TightVNC, UltraVNC, TigerVNC and others): the 8-byte value from the Password registry value, an .ini / .vnc file or a ~/.vnc/passwd file, given as hex. '
  + 'VNC encrypts these with a fixed, publicly known DES key, so the stored value is as good as plaintext. One value per line; "Password=…" and registry "hex:…" prefixes are accepted.',
  [],
  (t) => t.split(/\r?\n/).filter(l => l.trim()).map(decryptVncPassword).join('\n'), { text: true, aliases: ['vnc', 'vncpasswd', 'tightvnc', 'ultravnc', 'realvnc'] });
