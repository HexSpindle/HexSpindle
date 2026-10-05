import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseIPv4, ipv4ToStr } from './_ipaddr.js';

const FMT = ['Dotted Decimal', 'Decimal', 'Octal', 'Hex'];

function parse(tok, fmt) {
  if (fmt === 'Dotted Decimal') return parseIPv4(tok);
  if (fmt === 'Decimal') return BigInt(tok);
  if (fmt === 'Octal') return BigInt(parseInt(tok, 8));
  return BigInt(parseInt(tok, 16));
}

module('Change IP format', 'Converts IPv4 addresses between dotted, decimal, octal and hex.',
  [A.select('Input format', FMT), A.select('Output format', FMT, 'Hex')],
  (t, fin, fout) => t.split(/\s+/).filter(Boolean).map(tok => {
    const n = parse(tok, fin);
    const ip = ipv4ToStr(n);
    return { 'Dotted Decimal': ip, 'Decimal': n.toString(), 'Octal': '0' + n.toString(8), 'Hex': '0x' + n.toString(16).padStart(8, '0') }[fout];
  }).join('\n'),
  { text: true });
