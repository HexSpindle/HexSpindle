import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { pyFloatRepr } from './_num.js';

const U = {
  'Bits (b)': 1, 'Nibbles': 4, 'Bytes (B)': 8, 'Kilobits (kb)': 1e3, 'Kilobytes (kB)': 8e3, 'Kibibytes (KiB)': 8 * 1024,
  'Megabits (Mb)': 1e6, 'Megabytes (MB)': 8e6, 'Mebibytes (MiB)': 8 * 1024 ** 2, 'Gigabits (Gb)': 1e9, 'Gigabytes (GB)': 8e9,
  'Gibibytes (GiB)': 8 * 1024 ** 3, 'Terabytes (TB)': 8e12, 'Tebibytes (TiB)': 8 * 1024 ** 4, 'Petabytes (PB)': 8e15,
};

module('Convert data units', 'Converts between units of digital information.', [A.select('Input units', Object.keys(U), 'Bytes (B)'), A.select('Output units', Object.keys(U), 'Kilobytes (kB)')],
  (t, a, b) => t.split(/\s+/).filter(Boolean).map(x => pyFloatRepr(Number(x) * U[a] / U[b])).join('\n'), { text: true });
