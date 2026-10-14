import { module } from './_cat.js';

// Reverses the Dean Edwards p,a,c,k,e,r (eval(function(p,a,c,k,e,d){...}('payload',radix,count,'a|b|c'.split('|'),0,{}))),
// which is the most common "packed" JavaScript seen in the wild. The substitution is done by string rewriting, not by eval.
function base(n, radix) {
  // The packer's own base encoder: 0-9, a-z, then A-Z, with a leading digit for the high part.
  const toChar = c => c < 10 ? String(c) : c < 36 ? String.fromCharCode(97 + c - 10) : String.fromCharCode(65 + c - 36);
  return (n < radix ? '' : base(Math.floor(n / radix), radix)) + toChar(n % radix);
}

export function unpack(code) {
  const m = /}\s*\(\s*(['"])(.*?)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])(.*?)\5\s*\.split\(\s*(['"])(.*?)\7\s*\)/s.exec(code);
  if (!m) throw new Error('This is not p,a,c,k,e,r-packed JavaScript (no eval(function(p,a,c,k,e,d){…}) payload found)');
  let [, , payload, radix, count, , words, , sep] = m;
  radix = +radix; count = +count;
  const dict = words.split(sep);
  // Un-escape the payload's \' \" \\ and \n so the token substitution sees the real source.
  payload = payload.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '');
  const unpacked = payload.replace(/\b\w+\b/g, token => {
    const index = parseInt(token, 36);
    return (Number.isNaN(index) ? null : dict[index]) || token;
  });
  return unpacked;
}

module('Unpack JavaScript',
  'Unpacks JavaScript compressed with the Dean Edwards p,a,c,k,e,r (the eval(function(p,a,c,k,e,d){…}) wrapper), recovering the original source. '
  + 'The token dictionary is substituted by rewriting the text, so no code is executed — safe to run on an untrusted script. Follow with JavaScript Beautify to format the result.',
  [],
  (t) => unpack(t), { text: true, aliases: ['unpack', 'packer', 'pack', 'eval unpack', 'deobfuscate javascript'] });
