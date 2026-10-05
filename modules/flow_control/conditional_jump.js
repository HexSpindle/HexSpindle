import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Conditional Jump', 'Jump to a Label if the input matches the regex (or does not match, if inverted).',
  [A.regex('Match (regex)', ''), A.boolean('Invert match', false), A.string('Label name', ''), A.number('Maximum jumps', 10)],
  data => data, { flow: true });
