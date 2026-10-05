import { module } from './_cat.js';

module('Strip UDP header', 'Removes the 8-byte UDP header leaving the payload.', [],
  (data) => data.subarray(8));
