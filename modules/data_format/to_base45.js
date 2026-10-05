import { module } from './_cat.js';

export const CH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

module('To Base45', 'Encodes data using Base45 (RFC 9285), as used by EU Digital COVID certificates.',
  [], (data) => {
    const out = [];
    for (let i = 0; i < data.length; i += 2) {
      if (i + 1 < data.length) {
        const n = data[i] * 256 + data[i + 1];
        out.push(CH[n % 45] + CH[Math.floor(n / 45) % 45] + CH[Math.floor(n / 2025)]);
      } else {
        out.push(CH[data[i] % 45] + CH[Math.floor(data[i] / 45)]);
      }
    }
    return out.join('');
  });
