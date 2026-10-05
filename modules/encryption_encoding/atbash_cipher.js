import { module } from './_cat.js';

module('Atbash Cipher', 'Mirrors each letter (A<->Z, a<->z). Its own inverse.', [],
  (t) => [...t].map(c => c >= 'A' && c <= 'Z' ? String.fromCharCode(155 - c.charCodeAt(0)) : c >= 'a' && c <= 'z' ? String.fromCharCode(219 - c.charCodeAt(0)) : c).join(''), { text: true });
