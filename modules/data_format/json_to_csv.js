import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function flatten(target) {
  const output = {};
  (function step(object, prev) {
    Object.keys(object).forEach(key => {
      const value = object[key];
      const type = Object.prototype.toString.call(value);
      const newKey = prev ? prev + '.' + key : key;
      if ((type === '[object Object]' || type === '[object Array]') && Object.keys(value).length) return step(value, newKey);
      output[newKey] = value;
    });
  })(target);
  return output;
}

const unescape = s => s.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\t/g, '\t');

module('JSON to CSV', 'Converts a JSON array of objects (or arrays) to CSV.',
  [A.string('Cell delimiter', ','), A.string('Row delimiter', '\\r\\n')], (t, cd, rd) => {
    const input = JSON.parse(t);
    const cellDelim = unescape(cd), rowDelim = unescape(rd);
    const escape = (data, force) => {
      const isPrimitive = data == null || typeof data !== 'object';
      if (isPrimitive) data = `${data}`;
      else if (force) data = JSON.stringify(data);
      data = data.replace(/"/g, '""');
      if (data.indexOf(cellDelim) >= 0 || data.indexOf(rowDelim) >= 0 || data.indexOf('\n') >= 0 ||
          data.indexOf('\r') >= 0 || data.indexOf('"') >= 0) data = `"${data}"`;
      return data;
    };
    const toCSV = (rows, force = false) => {
      if (rows[0] instanceof Array) {
        return rows.map(row => row.map(d => escape(d, force)).join(cellDelim)).join(rowDelim) + rowDelim;
      }
      const header = Object.keys(rows[0]);
      return header.map(d => escape(d, force)).join(cellDelim) + rowDelim +
        rows.map(row => header.map(h => row[h]).map(d => escape(d, force)).join(cellDelim)).join(rowDelim) + rowDelim;
    };
    try {
      return toCSV(input instanceof Array ? input : [input]);
    } catch (err) {
      try {
        const flat = flatten(input);
        return toCSV(flat instanceof Array ? flat : [flat], true);
      } catch (err2) {
        throw new Error('Unable to parse JSON to CSV: ' + err2.toString());
      }
    }
  }, { text: true });
