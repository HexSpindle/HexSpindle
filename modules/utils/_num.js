export function pyFloatRepr(n) {
  if (!Number.isFinite(n)) return n > 0 ? 'inf' : (n < 0 ? '-inf' : 'nan');
  if (Number.isInteger(n) && Math.abs(n) < 1e16) return (Object.is(n, -0) ? '-0' : String(n)) + '.0';
  let s = String(n);
  const m = /^(-?)(\d(?:\.\d+)?)e([+-])(\d+)$/.exec(s);
  if (m) s = `${m[1]}${m[2]}e${m[3]}${m[4].padStart(2, '0')}`;
  return s;
}
