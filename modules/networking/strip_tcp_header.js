import { module } from './_cat.js';

module('Strip TCP header', 'Removes the TCP header (data offset * 4 bytes) leaving the payload.', [],
  (data) => data.subarray((data[12] >> 4) * 4));
