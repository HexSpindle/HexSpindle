import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { pyFloatRepr } from './_num.js';

const U = {
  'Micrograms (µg)': 1e-9, 'Milligrams (mg)': 1e-6, 'Grams (g)': 1e-3, 'Kilograms (kg)': 1, 'Tonnes (t)': 1000, 'Grains (gr)': 6.479891e-5,
  'Ounces (oz)': 0.028349523125, 'Pounds (lb)': 0.45359237, 'Stone (st)': 6.35029318, 'US tons (ton)': 907.18474, 'Imperial tons (long ton)': 1016.0469088,
};

module('Convert mass', 'Converts between units of mass.', [A.select('Input units', Object.keys(U), 'Kilograms (kg)'), A.select('Output units', Object.keys(U), 'Pounds (lb)')],
  (t, a, b) => t.split(/\s+/).filter(Boolean).map(x => pyFloatRepr(Number(x) * U[a] / U[b])).join('\n'), { text: true });
