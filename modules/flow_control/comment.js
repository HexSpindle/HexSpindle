import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Comment', 'Add a note to the recipe. Does not change the data.', [A.area('Comment', '')], data => data, { flow: true });
