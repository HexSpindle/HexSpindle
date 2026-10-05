import { module } from './_cat.js';

module('To COBS', 'Consistent Overhead Byte Stuffing: removes zero bytes from the data by replacing runs between them with length markers, for use on framed serial links.', [],
  (data) => {
    if (!data.length) return new Uint8Array(0);
    const out = [];
    let d = [0, ...data];
    while (d.length > 0) {
      const end = d.findIndex((v, i) => v === 0 && i > 0);
      if ((end < 0 || end > 254) && d.length > 254) {
        out.push(255, ...d.slice(1, 255));
        d = d.slice(255);
        if (d.length) d = [0, ...d];
      } else if (end < 0) {
        out.push(d.length, ...d.slice(1));
        d = [];
      } else {
        out.push(end, ...d.slice(1, end));
        d = d.slice(end);
      }
    }
    return new Uint8Array(out);
  });
