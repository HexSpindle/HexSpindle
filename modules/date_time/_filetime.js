export function bigFloorDiv(a, b) {
  let q = a / b;
  const r = a % b;
  if (r !== 0n && (r < 0n) !== (b < 0n)) q -= 1n;
  return q;
}

export function parseSignedBigInt(tok, hex) {
  let s = tok.trim();
  let neg = false;
  if (s[0] === '+' || s[0] === '-') { neg = s[0] === '-'; s = s.slice(1); }
  if (hex) {
    if (/^0[xX]/.test(s)) s = s.slice(2);
    if (!/^[0-9a-fA-F]+$/.test(s)) throw new Error(`invalid literal for int() with base 16: '${tok}'`);
    return (neg ? -1n : 1n) * BigInt('0x' + s);
  }
  if (!/^[0-9]+$/.test(s)) throw new Error(`invalid literal for int() with base 10: '${tok}'`);
  return (neg ? -1n : 1n) * BigInt(s);
}
