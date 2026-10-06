import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { beautify } from './_jstok.js';

let escPromise = null;

module('JavaScript Beautify', 'Parses and pretty prints valid JavaScript code (esprima + escodegen). JSON, which is not a valid JavaScript program on its own, falls back to a token-based formatter.',
  [A.string('Indent string', '\\t'), A.select('Quotes', ['Auto', 'Single', 'Double']),
    A.boolean('Semicolons before closing braces', true), A.boolean('Include comments', true)],
  async (t, indent, quotes = 'Auto', semicolons = true, comments = true) => {
    if (!escPromise) escPromise = import('./_escodegen.mjs');
    const { esprima, escodegen } = await escPromise;
    const style = (indent || '\\t').replace(/\\t/g, '\t').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    let ast;
    try {
      ast = esprima.parseScript(t, { range: true, tokens: true, comment: true });
    } catch (e) {
      let isJson = false;
      try { JSON.parse(t); isJson = true; } catch { /* not JSON either */ }
      if (isJson) return beautify(t, style);
      throw new Error('Unable to parse JavaScript.<br>' + e.message);
    }
    const options = { format: { indent: { style }, quotes: String(quotes).toLowerCase(), semicolons: !!semicolons }, comment: !!comments };
    if (options.comment) ast = escodegen.attachComments(ast, ast.comments, ast.tokens);
    return escodegen.generate(ast, options);
  },
  { text: true }
);
