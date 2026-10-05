import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const OUI = { VMware: '00:50:56', VirtualBox: '08:00:27', Docker: '02:42:ac', 'Random locally administered': null };

function rand8() { return crypto.getRandomValues(new Uint8Array(1))[0]; }

module('Generate MAC Address', 'Generates random MAC addresses, optionally from a known virtualization vendor OUI.',
  [A.select('Vendor OUI', Object.keys(OUI)), A.select('Delimiter', ['Colon', 'Hyphen', 'None', 'Cisco (dotted)']), A.number('Count', 1, 1, 1000)],
  (data, vendor, delim, count) => {
    const out = [];
    for (let c = 0; c < count; c++) {
      let prefix;
      if (OUI[vendor]) prefix = OUI[vendor].split(':').map(x => parseInt(x, 16));
      else prefix = [(rand8() & 0xfc) | 0x02, rand8(), rand8()];
      const mac = [...prefix];
      for (let i = 0; i < 6 - prefix.length; i++) mac.push(rand8());
      const hexpairs = mac.map(b => b.toString(16).padStart(2, '0'));
      if (delim === 'Colon') out.push(hexpairs.join(':'));
      else if (delim === 'Hyphen') out.push(hexpairs.join('-'));
      else if (delim === 'Cisco (dotted)') { const h = hexpairs.join(''); out.push([h.slice(0, 4), h.slice(4, 8), h.slice(8, 12)].join('.')); }
      else out.push(hexpairs.join(''));
    }
    return out.join('\n');
  }, { nondeterministic: true });
