import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { concat } from './_bytes.js';
import { buildHeader, padTo512, BLOCK } from './_tar.js';

module('Tar', 'Creates a tar archive containing the input as one file.', [A.string('Filename', 'file.txt')],
  (data, name) => {
    const header = buildHeader(name, data.length);
    const body = padTo512(concat(header, data));
    return concat(body, new Uint8Array(BLOCK * 2));
  });
