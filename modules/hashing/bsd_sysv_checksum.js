import { module } from './_cat.js';
import { A } from '../../core/registry.js';

export function bsdChecksum(u8) {
  let s = 0;
  for (const b of u8) {
    s = (s >> 1) + ((s & 1) << 15);
    s = (s + b) & 0xffff;
  }
  return s;
}

export function sysvChecksum(u8) {
  let s = 0;
  for (const b of u8) s += b;
  let r = (s & 0xffff) + (s >>> 16);
  r = (r & 0xffff) + (r >>> 16);
  return r;
}

module('BSD / SYSV Checksum', 'The classic UNIX `sum` checksum algorithms (BSD 16-bit rotating, and SysV 32-bit).',
  [A.select('Algorithm', ['BSD', 'SysV'])],
  (data, algo) => String(algo === 'BSD' ? bsdChecksum(data) : sysvChecksum(data)));
