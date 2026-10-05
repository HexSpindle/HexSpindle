import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { convertUnits, unitOptions } from './_decimal.js';

const UNITS = [
  'Bits (b)', 'Nibbles', 'Octets', 'Bytes (B)', '[Binary bits (2^n)]', 'Kibibits (Kib)', 'Mebibits (Mib)',
  'Gibibits (Gib)', 'Tebibits (Tib)', 'Pebibits (Pib)', 'Exbibits (Eib)', 'Zebibits (Zib)', 'Yobibits (Yib)',
  '[/Binary bits (2^n)]', '[Decimal bits (10^n)]', 'Decabits', 'Hectobits', 'Kilobits (Kb)', 'Megabits (Mb)',
  'Gigabits (Gb)', 'Terabits (Tb)', 'Petabits (Pb)', 'Exabits (Eb)', 'Zettabits (Zb)', 'Yottabits (Yb)',
  '[/Decimal bits (10^n)]', '[Binary bytes (8 x 2^n)]', 'Kibibytes (KiB)', 'Mebibytes (MiB)', 'Gibibytes (GiB)',
  'Tebibytes (TiB)', 'Pebibytes (PiB)', 'Exbibytes (EiB)', 'Zebibytes (ZiB)', 'Yobibytes (YiB)',
  '[/Binary bytes (8 x 2^n)]', '[Decimal bytes (8 x 10^n)]', 'Kilobytes (KB)', 'Megabytes (MB)', 'Gigabytes (GB)',
  'Terabytes (TB)', 'Petabytes (PB)', 'Exabytes (EB)', 'Zettabytes (ZB)', 'Yottabytes (YB)',
  '[/Decimal bytes (8 x 10^n)]',
];
const FACTOR = {
  'Bits (b)': 1, 'Nibbles': 4, 'Octets': 8, 'Bytes (B)': 8, 'Kibibits (Kib)': 1024, 'Mebibits (Mib)': 1048576,
  'Gibibits (Gib)': 1073741824, 'Tebibits (Tib)': 1099511627776, 'Pebibits (Pib)': 1125899906842624,
  'Exbibits (Eib)': 1152921504606847000, 'Zebibits (Zib)': 1.1805916207174113e+21,
  'Yobibits (Yib)': 1.2089258196146292e+24, 'Decabits': 10, 'Hectobits': 100, 'Kilobits (Kb)': 1000,
  'Megabits (Mb)': 1000000, 'Gigabits (Gb)': 1000000000, 'Terabits (Tb)': 1000000000000,
  'Petabits (Pb)': 1000000000000000, 'Exabits (Eb)': 1000000000000000000, 'Zettabits (Zb)': 1e+21,
  'Yottabits (Yb)': 1e+24, 'Kibibytes (KiB)': 8192, 'Mebibytes (MiB)': 8388608, 'Gibibytes (GiB)': 8589934592,
  'Tebibytes (TiB)': 8796093022208, 'Pebibytes (PiB)': 9007199254740992, 'Exbibytes (EiB)': 9223372036854776000,
  'Zebibytes (ZiB)': 9.44473296573929e+21, 'Yobibytes (YiB)': 9.671406556917033e+24, 'Kilobytes (KB)': 8000,
  'Megabytes (MB)': 8000000, 'Gigabytes (GB)': 8000000000, 'Terabytes (TB)': 8000000000000,
  'Petabytes (PB)': 8000000000000000, 'Exabytes (EB)': 8000000000000000000, 'Zettabytes (ZB)': 8e+21,
  'Yottabytes (YB)': 8e+24,
  'Kilobits (kb)': 1000, 'Kilobytes (kB)': 8000,
};

module('Convert data units', 'Converts a value from one unit of digital information to another.',
  [A.select('Input units', unitOptions(UNITS)), A.select('Output units', unitOptions(UNITS))],
  (t, a, b) => convertUnits(t, FACTOR[a], FACTOR[b]), { text: true });
