export function intToBaseBig(n, alphabet) {
  if (n === 0n) return alphabet[0];
  const base = BigInt(alphabet.length);
  let out = '';
  while (n > 0n) { out = alphabet[Number(n % base)] + out; n /= base; }
  return out;
}

export function baseToIntBig(s, alphabet) {
  const base = BigInt(alphabet.length);
  let n = 0n;
  for (const c of s) {
    const idx = alphabet.indexOf(c);
    if (idx < 0) throw new Error(`Character not in alphabet: ${JSON.stringify(c)}`);
    n = n * base + BigInt(idx);
  }
  return n;
}

export function bytesToBase(u8, alphabet) {
  let zeros = 0;
  while (zeros < u8.length && u8[zeros] === 0) zeros++;
  const rest = u8.subarray(zeros);
  let n = 0n;
  for (const b of rest) n = (n << 8n) | BigInt(b);
  return alphabet[0].repeat(zeros) + (rest.length ? intToBaseBig(n, alphabet) : '');
}

export function baseToBytes(s, alphabet) {
  let zeros = 0;
  while (zeros < s.length && s[zeros] === alphabet[0]) zeros++;
  const rest = s.slice(zeros);
  const n = rest.length ? baseToIntBig(rest, alphabet) : 0n;
  const bytes = [];
  let v = n;
  while (v > 0n) { bytes.unshift(Number(v & 0xffn)); v >>= 8n; }
  return new Uint8Array([...new Array(zeros).fill(0), ...bytes]);
}
