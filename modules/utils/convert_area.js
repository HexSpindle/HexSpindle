import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { pyFloatRepr } from './_num.js';

const U = {
  'Square metres (sq m)': 1, 'Square kilometres (sq km)': 1e6, 'Square centimetres (sq cm)': 1e-4, 'Square millimetres (sq mm)': 1e-6,
  'Hectares (ha)': 1e4, 'Acres (ac)': 4046.8564224, 'Square inches (sq in)': 0.00064516, 'Square feet (sq ft)': 0.09290304,
  'Square yards (sq yd)': 0.83612736, 'Square miles (sq mi)': 2589988.110336,
};

module('Convert area', 'Converts between units of area.', [A.select('Input units', Object.keys(U)), A.select('Output units', Object.keys(U), 'Hectares (ha)')],
  (t, a, b) => t.split(/\s+/).filter(Boolean).map(x => pyFloatRepr(Number(x) * U[a] / U[b])).join('\n'), { text: true });
