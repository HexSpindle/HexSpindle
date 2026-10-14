import { module } from './_cat.js';
import { base64Decode } from '../../core/util.js';

module('PowerShell Decode EncodedCommand',
  'Decodes the Base64 payload of PowerShell\'s -EncodedCommand (also -enc / -e / -ec), which is the command text encoded as UTF-16LE. '
  + 'Give the whole command line (the Base64 argument is found automatically) or just the Base64 string. A leading UTF-16 byte-order mark is removed.',
  [],
  (t) => {
    const text = t.trim();
    // Pull the Base64 out of a command line such as: powershell -nop -w hidden -enc <base64>
    const m = /(?:-e|-ec|-en|-enc|-enco\w*|-EncodedCommand)\s+['"]?([A-Za-z0-9+/=]+)['"]?/i.exec(text);
    const b64 = (m ? m[1] : text).replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length < 8) throw new Error('No Base64 EncodedCommand payload found');
    const bytes = base64Decode(b64);
    // The payload is UTF-16LE; some tools double-encode, which shows up as another -enc inside.
    const decoded = new TextDecoder('utf-16le').decode(bytes).replace(/^﻿/, '');
    return decoded;
  }, { text: true, aliases: ['powershell enc', '-encodedcommand', 'powershell base64', 'frombase64string'] });
