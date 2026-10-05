import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS } from '../../core/util.js';
import { parseNumbers } from './_num.js';

function variance(n, ddof) {
  if (n.length < ddof + 1) throw new Error(ddof ? 'variance requires at least two data points' : 'pstdev requires at least one data point');
  const mean = n.reduce((a, b) => a + b, 0) / n.length;
  return n.reduce((s, x) => s + (x - mean) ** 2, 0) / (n.length - ddof);
}

module('Standard Deviation', 'Sample or population standard deviation.', [A.select('Delimiter', DELIMS, 'Line feed'), A.select('Type', ['Population', 'Sample'])],
  (t, d, kind) => String(Math.sqrt(variance(parseNumbers(t, d), kind === 'Population' ? 0 : 1))), { text: true });
