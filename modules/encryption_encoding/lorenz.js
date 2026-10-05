import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { lorenzCrypt } from './_lorenz.js';

const DEFAULT_LUGS = {
  s1: '.x...xx.x.x..xxx.x.x.xxxx.x.x.x.x.x..x.xx.x',
  s2: '.xx.x.xxx..x.x.x..x.xx.x.xxx.x....x.xx.x.x.x..x',
  s3: '.x.x.x..xxx....x.x.xx.x.x.x..xxx.x.x..x.x.xx..x.x.x',
  s4: '.xx...xxxxx.x.x.xx...x.xx.x.x..x.x.xx.x..x.x.x.x.x.x.',
  s5: 'xx...xx.x..x.xx.x...x.x.x.x.x.x.x.x.xx..xxxx.x.x...xx.x..x.',
  m37: 'x.x.x.x.x.x...x.x.x...x.x.x...x.x....',
  m61: '.xxxx.xxxx.xxx.xxxx.xx....xxx.xxxx.xxxx.xxxx.xxxx.xxx.xxxx...',
  x1: '.x...xxx.x.xxxx.x...x.x..xxx....xx.xxxx..',
  x2: 'x..xxx...x.xxxx..xx..x..xx.xx..',
  x3: '..xx..x.xxx...xx...xx..xx.xx.',
  x4: 'xx..x..xxxx..xx.xxx....x..',
  x5: 'xx..xx....xxxx.x..x.x..',
};

module('Lorenz',
  'Encipher/decipher with the WW2 German Lorenz SZ40/42 cipher attachment ("Tunny"): a 12-wheel ' +
  'rotor machine that attached in-line between teleprinters, XORing a pseudorandom 5-bit ITA2 key ' +
  'stream (from five "psi" wheels and five "chi" wheels) onto the traffic; two further "mu"/motor ' +
  'wheels intermittently hold up the psi wheels’ stepping. SZ40, SZ42a and SZ42b models are ' +
  'supported, along with the KH/ZMUG/BREAM historical wheel (lug) patterns or a fully custom one ' +
  '(use the lug fields below with "x" for an active lug and "." for inactive). "Send" enciphers ' +
  'plaintext to ITA2 ciphertext letters; "Receive" deciphers ITA2 ciphertext back to plaintext.',
  [
    A.select('Model', ['SZ40', 'SZ42a', 'SZ42b']),
    A.select('Wheel pattern', ['KH Pattern', 'ZMUG Pattern', 'BREAM Pattern', 'No Pattern', 'Custom']),
    A.boolean('KT-Schalter (limitation switch)', false),
    A.select('Mode', ['Send', 'Receive']),
    A.select('Input type', ['Plaintext', 'ITA2']),
    A.select('Output type', ['Plaintext', 'ITA2']),
    A.select('ITA2 format', ['5/8/9', '+/-/.']),
    A.number('Psi1 start (1-43)', 1, 1, 43), A.number('Psi2 start (1-47)', 1, 1, 47),
    A.number('Psi3 start (1-51)', 1, 1, 51), A.number('Psi4 start (1-53)', 1, 1, 53),
    A.number('Psi5 start (1-59)', 1, 1, 59), A.number('M37 start (1-37)', 1, 1, 37),
    A.number('M61 start (1-61)', 1, 1, 61), A.number('Chi1 start (1-41)', 1, 1, 41),
    A.number('Chi2 start (1-31)', 1, 1, 31), A.number('Chi3 start (1-29)', 1, 1, 29),
    A.number('Chi4 start (1-26)', 1, 1, 26), A.number('Chi5 start (1-23)', 1, 1, 23),
    A.string('Psi1 lugs (43, custom only)', DEFAULT_LUGS.s1),
    A.string('Psi2 lugs (47, custom only)', DEFAULT_LUGS.s2),
    A.string('Psi3 lugs (51, custom only)', DEFAULT_LUGS.s3),
    A.string('Psi4 lugs (53, custom only)', DEFAULT_LUGS.s4),
    A.string('Psi5 lugs (59, custom only)', DEFAULT_LUGS.s5),
    A.string('M37 lugs (37, custom only)', DEFAULT_LUGS.m37),
    A.string('M61 lugs (61, custom only)', DEFAULT_LUGS.m61),
    A.string('Chi1 lugs (41, custom only)', DEFAULT_LUGS.x1),
    A.string('Chi2 lugs (31, custom only)', DEFAULT_LUGS.x2),
    A.string('Chi3 lugs (29, custom only)', DEFAULT_LUGS.x3),
    A.string('Chi4 lugs (26, custom only)', DEFAULT_LUGS.x4),
    A.string('Chi5 lugs (23, custom only)', DEFAULT_LUGS.x5),
  ],
  (data, model, pattern, kt, mode, intype, outtype, format,
    s1, s2, s3, s4, s5, m37, m61, x1, x2, x3, x4, x5,
    lugs1, lugs2, lugs3, lugs4, lugs5, lugm37, lugm61, lugx1, lugx2, lugx3, lugx4, lugx5) => lorenzCrypt(data, {
    model, pattern, kt, mode, intype, outtype, format,
    s1, s2, s3, s4, s5, m37, m61, x1, x2, x3, x4, x5,
    lugs1, lugs2, lugs3, lugs4, lugs5, lugm37, lugm61, lugx1, lugx2, lugx3, lugx4, lugx5,
  }), { text: true });
