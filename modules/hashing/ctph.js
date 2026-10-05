import { module } from './_cat.js';
import { ctphDigest } from './_ctph.js';

module('CTPH', "Context Triggered Piecewise Hashing, also called Fuzzy Hashing, can match inputs that have homologies - sequences of identical bytes in the same order, though bytes in between may differ in content and length.\n\nCTPH was originally based on the work of Dr Andrew Tridgell and a spam email detector called SpamSum, adapted by Jesse Kornblum and published at DFRWS 2006 ('Identifying Almost Identical Files Using Context Triggered Piecewise Hashing').", [],
  (data) => ctphDigest(data), {});
