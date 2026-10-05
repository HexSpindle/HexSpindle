import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeAvroObjectContainerFile } from './_avro.js';

module('Avro to JSON', 'Converts Avro encoded data (an Avro Object Container File, with its schema embedded in the file header) into JSON.',
  [A.boolean('Force Valid JSON', true)],
  async (data, forceJSON) => {
    if (data.length <= 0) throw new Error('Please provide an input.');
    let results;
    try { results = await decodeAvroObjectContainerFile(data); } catch { throw new Error('Error parsing Avro file.'); }
    if (forceJSON) return JSON.stringify(results.length === 1 ? results[0] : results, null, 4);
    return results.reduce((s, cur) => s + JSON.stringify(cur) + '\n', '');
  });
