import { module } from './_cat.js';

function isHex(b) { return (b >= 48 && b <= 57) || (b >= 65 && b <= 70) || (b >= 97 && b <= 102); }
function hexVal(b) { return b <= 57 ? b - 48 : (b <= 70 ? b - 55 : b - 87); }

module('From Quoted Printable', 'Decodes MIME Quoted-Printable data.', [],
  (data) => {
    const out = [];
    let i = 0;
    const n = data.length;
    while (i < n) {
      if (data[i] === 0x3d) {
        i++;
        if (i >= n) break;
        if (data[i] === 10 || data[i] === 13) {
          if (data[i] !== 10) { while (i < n && data[i] !== 10) i++; }
          if (i < n) i++;
        } else if (data[i] === 0x3d) {
          out.push(0x3d); i++;
        } else if (i + 1 < n && isHex(data[i]) && isHex(data[i + 1])) {
          out.push((hexVal(data[i]) << 4) | hexVal(data[i + 1]));
          i += 2;
        } else {
          out.push(0x3d);
        }
      } else {
        out.push(data[i]); i++;
      }
    }
    return new Uint8Array(out);
  });
