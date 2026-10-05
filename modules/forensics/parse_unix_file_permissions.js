import { module } from './_cat.js';

function parseSymbolic(t) {
  let mode = 0;
  const rest = t.slice(1);
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    const grp = Math.floor(i / 3), pos = i % 3;
    const bit = (1 << (2 - pos)) << (3 * (2 - grp));
    const special = [0o4000, 0o2000, 0o1000][grp];
    if ('rwx'.includes(c)) mode |= bit;
    else if ('st'.includes(c)) mode |= bit | special;
    else if ('ST'.includes(c)) mode |= special;
  }
  return mode;
}

module('Parse UNIX file permissions', 'Explains an octal mode (755) or symbolic mode (drwxr-xr-x).', [],
  (t) => {
    t = t.trim();
    let ftype = '-', mode;
    if (/^[0-7]{3,4}$/.test(t)) mode = parseInt(t, 8);
    else if (/^[-dlcbps][-rwxsStT]{9}$/.test(t)) { ftype = t[0]; mode = parseSymbolic(t); }
    else throw new Error('Use an octal mode like 755 or a string like drwxr-xr-x');
    const out = [`Octal: ${(mode & 0o7777).toString(8).padStart(4, '0')}`];
    let sym = '';
    ['Owner', 'Group', 'Others'].forEach((who, i) => {
      const bits = (mode >> (6 - 3 * i)) & 7;
      const names = [['read', 4], ['write', 2], ['execute', 1]].filter(([, b]) => bits & b).map(([nm]) => nm);
      out.push(`${who}: ${names.join(', ') || 'no permissions'}`);
      sym += (bits & 4 ? 'r' : '-') + (bits & 2 ? 'w' : '-') + (bits & 1 ? 'x' : '-');
    });
    [['setuid', 0o4000], ['setgid', 0o2000], ['sticky', 0o1000]].forEach(([flag, bit]) => { if (mode & bit) out.push(`Special: ${flag}`); });
    out.splice(1, 0, `Symbolic: ${ftype}${sym}`);
    return out.join('\n');
  }, { text: true });
