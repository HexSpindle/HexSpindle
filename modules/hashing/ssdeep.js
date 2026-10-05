import { module } from './_cat.js';
import { ssdeepDigest } from './_ssdeep.js';

module('SSDEEP', "SSDEEP is a program for computing context triggered piecewise hashes (CTPH). Also called fuzzy hashes, CTPH can match inputs that have homologies - sequences of identical bytes in the same order, though bytes in between may differ in content and length.\n\nSSDEEP hashes are widely used for simple identification purposes (e.g. the 'Basic Properties' section in VirusTotal). This operation is fundamentally the same as CTPH, but their outputs differ in format (and are produced by two genuinely different fuzzy-hash implementations).", [],
  (data) => ssdeepDigest(data), {});
