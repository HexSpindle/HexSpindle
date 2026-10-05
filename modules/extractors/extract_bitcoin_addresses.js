import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { CHARSET, polymod, hrpExpand } from '../data_format/to_bech32.js';

const BTC_RE = /\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{11,71})\b/g;
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

async function base58CheckOk(addr) {
  let n = 0n;
  for (const c of addr) n = n * 58n + BigInt(B58.indexOf(c));
  if (n >= 1n << 200n) return false;
  const raw = new Uint8Array(25);
  for (let i = 24; i >= 0; i--) { raw[i] = Number(n & 0xffn); n >>= 8n; }
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', await crypto.subtle.digest('SHA-256', raw.subarray(0, 21))));
  return h[0] === raw[21] && h[1] === raw[22] && h[2] === raw[23] && h[3] === raw[24];
}

function bech32Ok(addr) {
  const data = [...addr.slice(3)].map(c => CHARSET.indexOf(c));
  if (data.length < 7) return false;
  const pm = polymod([...hrpExpand('bc'), ...data]);
  return data[0] === 0 ? pm === 1 : (data[0] <= 16 && pm === 0x2bc830a3);
}

module('Extract Bitcoin addresses', 'Extracts legacy (1…, 3…) and bech32 (bc1…) Bitcoin addresses, keeping only those whose Base58Check / bech32 checksum is valid.',
  [A.boolean('Display total', false), A.boolean('Unique', true)],
  async (t, total, uniq) => {
    const candidates = t.match(BTC_RE) || [];
    let found = [];
    for (const a of candidates) {
      if (a.startsWith('bc1') ? bech32Ok(a) : await base58CheckOk(a)) found.push(a);
    }
    if (uniq) found = [...new Set(found)];
    const out = found.join('\n');
    return total ? `Total found: ${found.length}\n\n${out}` : out;
  }, { text: true });
