import { module } from './_cat.js';

// Static, best-effort un-obfuscation of the tricks PowerShell malware leans on. Nothing is executed:
// each pass rewrites a syntactic obfuscation into the plain equivalent, repeatedly until the text stops changing.
function pass(code) {
  let s = code;
  // Backtick escapes: `n `t `r become real characters; any other backtick is just hiding a letter (i`e`x -> iex).
  s = s.replace(/`n/g, '\n').replace(/`t/g, '\t').replace(/`r/g, '\r').replace(/`([^"'])/g, '$1').replace(/`$/gm, '');
  // Adjacent string concatenation: 'a'+'b' or "a"+"b" -> 'ab'. Mixed quotes are normalised to single quotes.
  s = s.replace(/(['"])((?:\\.|(?!\1).)*)\1\s*\+\s*(['"])((?:\\.|(?!\3).)*)\3/g, (_, q1, a, q2, b) => `'${(a + b).replace(/'/g, "''")}'`);
  // Format operator: ("{0}{2}{1}" -f 'a','b','c') -> 'acb'.
  s = s.replace(/\(?\s*(['"])((?:\\.|(?!\1).)*)\1\s*-f\s*((?:\s*(['"])(?:\\.|(?!\4).)*\4\s*,?)+)\)?/gi, (whole, q, fmt, argList) => {
    const args = [...argList.matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)].map(m => m[2]);
    if (!/^(?:\{\d+\}|[^{}])*$/.test(fmt)) return whole;
    const out = fmt.replace(/\{(\d+)\}/g, (m, i) => args[+i] ?? m);
    return `'${out.replace(/'/g, "''")}'`;
  });
  // Character codes: [char]0x48, [char]72, [char]0b... -> the letter.
  s = s.replace(/\[char\]\s*(0x[0-9a-f]+|\d+)/gi, (_, n) => { const c = Number(n); return c >= 32 && c < 127 ? `'${String.fromCharCode(c).replace(/'/g, "''")}'` : `[char]${n}`; });
  // Then fold the resulting adjacent chars: 'H'+'i' handled by the concat pass on the next iteration.
  // -join on a char/string array: ('H','i' -join '') or -join ('H','i').
  s = s.replace(/\(?\s*((?:\s*(['"])(?:\\.|(?!\2).)*\2\s*,?)+)\)?\s*-join\s*(['"])((?:\\.|(?!\3).)*)\3/gi, (whole, list, _q, _jq, sep) => {
    const parts = [...list.matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)].map(m => m[2]);
    return `'${parts.join(sep).replace(/'/g, "''")}'`;
  });
  // Environment and type indirection used to hide "iex"/"Invoke-Expression" is left as-is but readable.
  return s;
}

module('PowerShell Deobfuscate',
  'Statically simplifies obfuscated PowerShell to make it readable, without running any of it. Removes backtick escapes, joins split string literals ("i"+"e"+"x"), '
  + 'evaluates the format operator ("{0}{1}" -f ...), resolves [char] codes and simple -join expressions, and repeats until nothing more changes. '
  + 'This is a best-effort aid for analysis, not a full interpreter; review the result.',
  [],
  (t) => {
    let s = t, previous;
    for (let i = 0; i < 20 && s !== previous; i++) { previous = s; s = pass(s); }
    return s;
  }, { text: true, aliases: ['powershell', 'deobfuscate', 'deobfuscate powershell', 'unobfuscate'] });
