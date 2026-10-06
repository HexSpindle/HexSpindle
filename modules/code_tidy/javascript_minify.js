import { module } from './_cat.js';

let terserPromise = null;

module('JavaScript Minify', 'Compresses JavaScript with terser (default options): strips comments and whitespace, shortens local names and simplifies expressions.', [],
  async (t) => {
    if (!terserPromise) terserPromise = import('./_terser.mjs');
    const { minify } = await terserPromise;
    const result = await minify(t);
    if (result.error) throw new Error(`Error minifying JavaScript. (${result.error})`);
    return result.code;
  },
  { text: true }
);
