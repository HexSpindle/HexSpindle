import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { convertUnits, unitOptions } from './_decimal.js';

const UNITS = [
  '[Metric]', 'Square metre (sq m)', 'Square kilometre (sq km)', 'Centiare (ca)', 'Deciare (da)', 'Are (a)',
  'Decare (daa)', 'Hectare (ha)', '[/Metric]', '[Imperial]', 'Square inch (sq in)', 'Square foot (sq ft)',
  'Square yard (sq yd)', 'Square mile (sq mi)', 'Perch (sq per)', 'Rood (ro)', 'International acre (ac)',
  '[/Imperial]', '[US customary units]', 'US survey acre (ac)', 'US survey square mile (sq mi)', 'US survey township',
  '[/US customary units]', '[Nuclear physics]', 'Yoctobarn (yb)', 'Zeptobarn (zb)', 'Attobarn (ab)', 'Femtobarn (fb)',
  'Picobarn (pb)', 'Nanobarn (nb)', 'Microbarn (μb)', 'Millibarn (mb)', 'Barn (b)', 'Kilobarn (kb)', 'Megabarn (Mb)',
  'Outhouse', 'Shed', 'Planck area', '[/Nuclear physics]', '[Comparisons]', 'Washington D.C.', 'Isle of Wight',
  'Wales', 'Texas', '[/Comparisons]',
];
const FACTOR = {
  'Square metre (sq m)': 1, 'Square kilometre (sq km)': 1000000, 'Centiare (ca)': 1, 'Deciare (da)': 10,
  'Are (a)': 100, 'Decare (daa)': 1000, 'Hectare (ha)': 10000, 'Square inch (sq in)': 0.00064516,
  'Square foot (sq ft)': 0.09290304, 'Square yard (sq yd)': 0.83612736, 'Square mile (sq mi)': 2589988.110336,
  'Perch (sq per)': 42.21, 'Rood (ro)': 1011, 'International acre (ac)': 4046.8564224,
  'US survey acre (ac)': 4046.87261, 'US survey square mile (sq mi)': 2589998.470305239,
  'US survey township': 93239944.9309886, 'Yoctobarn (yb)': 1e-52, 'Zeptobarn (zb)': 1e-49, 'Attobarn (ab)': 1e-46,
  'Femtobarn (fb)': 1e-43, 'Picobarn (pb)': 1e-40, 'Nanobarn (nb)': 1e-37, 'Microbarn (μb)': 1e-34,
  'Millibarn (mb)': 1e-31, 'Barn (b)': 1e-28, 'Kilobarn (kb)': 1e-25, 'Megabarn (Mb)': 1e-22, 'Planck area': 2.6e-70,
  'Shed': 1e-52, 'Outhouse': 1e-34, 'Washington D.C.': 176119191.502848, 'Isle of Wight': 380000000,
  'Wales': 20779000000, 'Texas': 696241000000,
  // Unit names from older HexSpindle versions, still accepted in saved recipes.
  'Square metres (sq m)': 1, 'Square kilometres (sq km)': 1000000, 'Square centimetres (sq cm)': 0.0001,
  'Square millimetres (sq mm)': 0.000001, 'Hectares (ha)': 10000, 'Acres (ac)': 4046.8564224,
  'Square inches (sq in)': 0.00064516, 'Square feet (sq ft)': 0.09290304, 'Square yards (sq yd)': 0.83612736,
  'Square miles (sq mi)': 2589988.110336,
};

module('Convert area', 'Converts a value from one unit of area to another.',
  [A.select('Input units', unitOptions(UNITS)), A.select('Output units', unitOptions(UNITS))],
  (t, a, b) => convertUnits(t, FACTOR[a], FACTOR[b]), { text: true });
