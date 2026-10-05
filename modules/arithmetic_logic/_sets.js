function unescape(s) {
  return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
}

export function splitSets(t, sd, idl) {
  sd = unescape(sd);
  idl = unescape(idl);
  const i = t.indexOf(sd);
  if (i < 0) throw new Error('Sample delimiter not found: provide two sets separated by it');
  const a = t.slice(0, i), b = t.slice(i + sd.length);
  return [a.split(idl), b.split(idl), idl];
}
