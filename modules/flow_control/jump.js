import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Jump', 'Jump to a Label in the recipe.', [A.string('Label name', ''), A.number('Maximum jumps', 10)], data => data, { flow: true });
