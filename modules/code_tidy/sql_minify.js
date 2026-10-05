import { module } from './_cat.js';
import { sqlmin } from './_vkbeautify.js';

module('SQL Minify', 'Compresses Structured Query Language (SQL) code.', [],
  (t) => sqlmin(t),
  { text: true }
);
