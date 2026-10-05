import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { convertUnits, unitOptions } from './_decimal.js';

const UNITS = [
  '[Metric]', 'Yoctogram (yg)', 'Zeptogram (zg)', 'Attogram (ag)', 'Femtogram (fg)', 'Picogram (pg)', 'Nanogram (ng)',
  'Microgram (μg)', 'Milligram (mg)', 'Centigram (cg)', 'Decigram (dg)', 'Gram (g)', 'Decagram (dag)',
  'Hectogram (hg)', 'Kilogram (kg)', 'Megagram (Mg)', 'Tonne (t)', 'Gigagram (Gg)', 'Teragram (Tg)', 'Petagram (Pg)',
  'Exagram (Eg)', 'Zettagram (Zg)', 'Yottagram (Yg)', '[/Metric]', '[Imperial Avoirdupois]', 'Grain (gr)',
  'Dram (dr)', 'Ounce (oz)', 'Pound (lb)', 'Nail', 'Stone (st)', 'Quarter (gr)', 'Tod', 'US hundredweight (cwt)',
  'Imperial hundredweight (cwt)', 'US ton (t)', 'Imperial ton (t)', '[/Imperial Avoirdupois]', '[Imperial Troy]',
  'Grain (gr)', 'Pennyweight (dwt)', 'Troy dram (dr t)', 'Troy ounce (oz t)', 'Troy pound (lb t)', 'Mark',
  '[/Imperial Troy]', '[Archaic]', 'Wey', 'Wool wey', 'Suffolk wey', 'Wool sack', 'Coal sack', 'Load', 'Last',
  'Flax or feather last', 'Gunpowder last', 'Picul', 'Rice last', '[/Archaic]', '[Comparisons]',
  'Big Ben (14 tonnes)', 'Blue whale (180 tonnes)', 'International Space Station (417 tonnes)',
  'Space Shuttle (2,041 tonnes)', 'RMS Titanic (52,000 tonnes)', 'Great Pyramid of Giza (6,000,000 tonnes)',
  'Earth\'s oceans (1.4 yottagrams)', '[/Comparisons]', '[Astronomical]',
  'A teaspoon of neutron star (5,500 million tonnes)', 'Lunar mass (ML)', 'Earth mass (M⊕)', 'Jupiter mass (MJ)',
  'Solar mass (M☉)', 'Sagittarius A* (7.5 x 10^36 kgs-ish)', 'Milky Way galaxy (1.2 x 10^42 kgs)',
  'The observable universe (1.45 x 10^53 kgs)', '[/Astronomical]',
];
const FACTOR = {
  'Yoctogram (yg)': 1e-24, 'Zeptogram (zg)': 1e-21, 'Attogram (ag)': 1e-18, 'Femtogram (fg)': 1e-15,
  'Picogram (pg)': 1e-12, 'Nanogram (ng)': 1e-9, 'Microgram (μg)': 0.000001, 'Milligram (mg)': 0.001,
  'Centigram (cg)': 0.01, 'Decigram (dg)': 0.1, 'Gram (g)': 1, 'Decagram (dag)': 10, 'Hectogram (hg)': 100,
  'Kilogram (kg)': 1000, 'Megagram (Mg)': 1000000, 'Tonne (t)': 1000000, 'Gigagram (Gg)': 1000000000,
  'Teragram (Tg)': 1000000000000, 'Petagram (Pg)': 1000000000000000, 'Exagram (Eg)': 1000000000000000000,
  'Zettagram (Zg)': 1e+21, 'Yottagram (Yg)': 1e+24, 'Grain (gr)': 0.06479891, 'Dram (dr)': 1.7718451953125,
  'Ounce (oz)': 28.349523125, 'Pound (lb)': 453.59237, 'Nail': 3175.14659, 'Stone (st)': 6350.29318,
  'Quarter (gr)': 12700.58636, 'Tod': 12700.58636, 'US hundredweight (cwt)': 45359.237,
  'Imperial hundredweight (cwt)': 50802.34544, 'US ton (t)': 907184.74, 'Imperial ton (t)': 1016046.9088,
  'Pennyweight (dwt)': 1.55517384, 'Troy dram (dr t)': 3.8879346, 'Troy ounce (oz t)': 31.1034768,
  'Troy pound (lb t)': 373.2417216, 'Mark': 248.8278144, 'Wey': 76500, 'Wool wey': 101700, 'Suffolk wey': 161500,
  'Wool sack': 153000, 'Coal sack': 50802.34544, 'Load': 918000, 'Last': 1836000, 'Flax or feather last': 770000,
  'Gunpowder last': 1090000, 'Picul': 60478.982, 'Rice last': 1200000, 'Big Ben (14 tonnes)': 14000000,
  'Blue whale (180 tonnes)': 180000000, 'International Space Station (417 tonnes)': 417000000,
  'Space Shuttle (2,041 tonnes)': 2041000000, 'RMS Titanic (52,000 tonnes)': 52000000000,
  'Great Pyramid of Giza (6,000,000 tonnes)': 6000000000000, 'Earth\'s oceans (1.4 yottagrams)': 1.4e+24,
  'A teaspoon of neutron star (5,500 million tonnes)': 5500000000000000, 'Lunar mass (ML)': 7.342e+25,
  'Earth mass (M⊕)': 5.97219e+27, 'Jupiter mass (MJ)': 1.8981411476999997e+30, 'Solar mass (M☉)': 1.98855e+33,
  'Sagittarius A* (7.5 x 10^36 kgs-ish)': 7.5e+39, 'Milky Way galaxy (1.2 x 10^42 kgs)': 1.2e+45,
  'The observable universe (1.45 x 10^53 kgs)': 1.45e+56,
  // Unit names from older HexSpindle versions, still accepted in saved recipes.
  'Micrograms (µg)': 0.000001, 'Milligrams (mg)': 0.001, 'Grams (g)': 1, 'Kilograms (kg)': 1000,
  'Tonnes (t)': 1000000, 'Grains (gr)': 0.06479891, 'Ounces (oz)': 28.349523125, 'Pounds (lb)': 453.59237,
  'US tons (ton)': 907184.74, 'Imperial tons (long ton)': 1016046.9088,
};

module('Convert mass', 'Converts a value from one unit of mass to another.',
  [A.select('Input units', unitOptions(UNITS)), A.select('Output units', unitOptions(UNITS))],
  (t, a, b) => convertUnits(t, FACTOR[a], FACTOR[b]), { text: true });
