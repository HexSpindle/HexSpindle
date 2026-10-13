// Shared helpers for the line-oriented text utilities.

// Splits text into lines and remembers its line ending, so the result can be joined the way it came in.
export function splitLines(text) {
  return { lines: text.split(/\r\n|\n|\r/), eol: text.includes('\r\n') ? '\r\n' : text.includes('\n') ? '\n' : text.includes('\r') ? '\r' : '\n' };
}

// Parses a selection such as "1,3-5,10-,-2" into 0-based indexes, in the order written.
//   N      item N                N-M    items N to M
//   N-     item N to the end     -N     the last N items
export function parseRanges(spec, length) {
  const out = [];
  for (const part of String(spec).split(',').map(p => p.trim()).filter(Boolean)) {
    let m;
    if ((m = /^(\d+)$/.exec(part))) { if (+m[1] >= 1 && +m[1] <= length) out.push(+m[1] - 1); }
    else if ((m = /^(\d+)\s*-\s*(\d+)$/.exec(part))) { for (let i = Math.max(1, +m[1]); i <= Math.min(length, +m[2]); i++) out.push(i - 1); }
    else if ((m = /^(\d+)\s*-$/.exec(part))) { for (let i = Math.max(1, +m[1]); i <= length; i++) out.push(i - 1); }
    else if ((m = /^-\s*(\d+)$/.exec(part))) { for (let i = Math.max(0, length - +m[1]); i < length; i++) out.push(i); }
    else throw new Error(`Cannot read "${part}": use numbers and ranges such as 1,3-5,10- or -2 (the last two)`);
  }
  return out;
}
