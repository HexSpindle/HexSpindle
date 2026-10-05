import { module } from './_cat.js';

module('Strip HTTP headers', 'Removes the HTTP headers, keeping only the body.', [],
  (data) => {
    for (const sep of [[0x0d, 0x0a, 0x0d, 0x0a], [0x0a, 0x0a]]) {
      outer: for (let i = 0; i <= data.length - sep.length; i++) {
        for (let j = 0; j < sep.length; j++) if (data[i + j] !== sep[j]) continue outer;
        return data.subarray(i + sep.length);
      }
    }
    return data;
  });
