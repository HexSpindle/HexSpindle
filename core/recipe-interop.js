/* HexSpindle <-> CyberChef recipe interchange.
 * Only mappings checked against the CyberChef operation definitions are allowed.
 * Never silently skip or reinterpret unsupported operations.
 */

const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
const isRecord = x => !!x && typeof x === 'object' && !Array.isArray(x);
const knownDelimiters = new Set(['Space', 'Comma', 'Semi-colon', 'Colon', 'Line feed', 'CRLF', 'None', '0x', '0x with comma', '\\x']);
const validBase64Alphabet = x => typeof x === 'string' && x.length > 0;
const compatibleKey = key => isRecord(key) && typeof key.string === 'string' && ['Hex', 'UTF8', 'Latin1', 'Base64'].includes(key.option);

// Bidirectional mappings checked against the GCHQ CyberChef operation definitions
// in src/core/operations. Never assume matching names imply matching arguments.
// Some HexSpindle settings have no exact CyberChef equivalent and are rejected.
const isBool = x => typeof x === 'boolean';
const isText = x => typeof x === 'string';
const isNumber = x => Number.isFinite(x);
const isNat = x => Number.isInteger(x) && x >= 0;
const goodArray = (a, ...check) => Array.isArray(a) && a.length === check.length &&
  a.every((x, i) => check[i](x));
const valueIn = (...options) => x => options.includes(x);
const goodToggle = x => isRecord(x) && typeof x.string === 'string' &&
  ['Hex', 'UTF8', 'Latin1', 'Base64', 'Decimal', 'Binary'].includes(x.option);
const emptyToggle = x => goodToggle(x) && x.string === '';
const emptyBinary = () => ({ option: 'Hex', string: '' });
const byteArgs = args => goodArray(args, isNat, isNat, isBool);
// CyberChef's 'Nothing' option is not equivalent to our per-character setting.
const sharedHeadDelimiters = new Set(['Line feed', 'CRLF', 'Space', 'Comma', 'Semi-colon', 'Colon']);
const findModes = {
  'Regex': 'Regex',
  'Simple string': 'Simple string',
  'Extended (\\n, \\t, ...)': 'Extended (\\n, \\t, \\x...)',
};
const reverseFindModes = Object.fromEntries(Object.entries(findModes).map(([k, v]) => [v, k]));
function safeFindMode(find, mode) {
  // HexSpindle Extended supports only the three escapes below, while
  // CyberChef also supports hex byte escapes, backspace and form feed.
  return mode !== 'Extended (\\n, \\t, ...)' || !/\\(?![ntr])/.test(find);
}
const findParts = a => goodArray(a, isText, isText, isText, isBool, isBool, isBool, isBool) &&
  Object.hasOwn(findModes, a[2]) && safeFindMode(a[0], a[2]) &&
  // Simple/Extended use literal replacement in HexSpindle, but CyberChef's
  // regex engine interprets special $ substitution tokens. Reject ambiguous
  // replacement strings rather than silently changing their meaning.
  (a[2] === 'Regex' || !a[1].includes('$')) &&
  (a[2] !== 'Extended (\\n, \\t, ...)' || !a[1].includes('\\'));
function toCyberFind(a) {
  if (!findParts(a)) return null;
  return [{ option: findModes[a[2]], string: a[0] }, a[1], ...a.slice(3)];
}
function fromCyberFind(a) {
  if (!goodArray(a, x => isRecord(x) && isText(x.string) && isText(x.option), isText, isBool, isBool, isBool, isBool) ||
      !Object.hasOwn(reverseFindModes, a[0].option)) return null;
  const result = [a[0].string, a[1], reverseFindModes[a[0].option], ...a.slice(2)];
  return findParts(result) ? result : null;
}
function toCyberAesEncrypt(a) {
  if (!goodArray(a, compatibleKey, compatibleKey, valueIn('Raw', 'Hex'), valueIn('Hex', 'Raw'))) return null;
  return [a[0], a[1], 'CBC', a[2], a[3], emptyBinary(), 'Off'];
}
function fromCyberAesEncrypt(a) {
  if (!Array.isArray(a) || a.length !== 7 || a[2] !== 'CBC' ||
      !emptyToggle(a[5]) || a[6] !== 'Off') return null;
  const r = [a[0], a[1], a[3], a[4]];
  return toCyberAesEncrypt(r) ? r : null;
}
function toCyberAesDecrypt(a) {
  if (!goodArray(a, compatibleKey, compatibleKey, valueIn('Raw', 'Hex'), valueIn('Hex', 'Raw'))) return null;
  return [a[0], a[1], 16, 'CBC', a[2], a[3], emptyBinary(), emptyBinary(), 'Off'];
}
function fromCyberAesDecrypt(a) {
  if (!Array.isArray(a) || a.length !== 9 || a[2] !== 16 || a[3] !== 'CBC' ||
      !emptyToggle(a[6]) || !emptyToggle(a[7]) || a[8] !== 'Off') return null;
  const r = [a[0], a[1], a[4], a[5]];
  return toCyberAesDecrypt(r) ? r : null;
}
function headTailToCyber(a) {
  return goodArray(a, isNat, isText, isBool) && !a[2] && sharedHeadDelimiters.has(a[1]) ? [a[1], a[0]] : null;
}
function headTailFromCyber(a) {
  return goodArray(a, isText, isNat) && sharedHeadDelimiters.has(a[0]) ? [a[1], a[0], false] : null;
}

const CYBERCHEF = {
  'To Base64': { validate: a => goodArray(a, validBase64Alphabet) },
  'From Base64': { validate: a => goodArray(a, validBase64Alphabet, isBool, isBool) },
  'To Base32': { validate: a => goodArray(a, validBase64Alphabet) },
  'From Base32': { validate: a => goodArray(a, validBase64Alphabet, isBool) },
  'To Hex': { validate: a => goodArray(a, x => knownDelimiters.has(x), isNat) },
  'From Hex': { validate: a => goodArray(a, x => ['Auto', ...knownDelimiters, 'Percent'].includes(x)) },
  'To Binary': { validate: a => goodArray(a, isText, n => isNat(n) && n >= 1 && n <= 64) },
  'From Binary': { validate: a => goodArray(a, isText, n => isNat(n) && n >= 1 && n <= 64) },
  'To Decimal': { validate: a => goodArray(a, isText, isBool) },
  'From Decimal': { validate: a => goodArray(a, isText, isBool) },
  ROT13: { validate: a => goodArray(a, isBool, isBool, isBool, isNumber) },
  ROT47: { validate: a => goodArray(a, isNumber) },
  'URL Encode': { validate: a => goodArray(a, isBool) },
  'URL Decode': {
    // HexSpindle currently always treats '+' as a space.
    toCyber: a => goodArray(a) ? [true] : null,
    fromCyber: a => goodArray(a, x => x === true) ? [] : null,
  },
  'Remove null bytes': { validate: a => goodArray(a) },
  'Remove whitespace': { validate: a => goodArray(a, isBool, isBool, isBool, isBool, isBool, isBool) },
  'To Lower case': { validate: a => goodArray(a) },
  'To Upper case': { validate: a => goodArray(a, valueIn('All', 'Word', 'Sentence')) },
  'Defang IP Addresses': { validate: a => goodArray(a) },
  'Defang URL': { validate: a => goodArray(a, isBool, isBool, isBool,
    valueIn('Valid domains and full URLs', 'Only full URLs', 'Everything')) },
  Reverse: {
    // Line mode differs around terminal CRLF and empty lines.
    validate: a => goodArray(a, valueIn('Byte', 'Character')),
  },
  XOR: {
    // Standard, Input differential, Output differential share key updates.
    // CyberChef's Cascade uses the next input byte; HexSpindle's differs.
    validate: a => goodArray(a, x => goodToggle(x) &&
      ['Hex', 'UTF8', 'Latin1', 'Base64', 'Decimal'].includes(x.option),
      valueIn('Standard', 'Input differential', 'Output differential'), isBool),
  },
  'AES Encrypt': { toCyber: toCyberAesEncrypt, fromCyber: fromCyberAesEncrypt },
  'AES Decrypt': { toCyber: toCyberAesDecrypt, fromCyber: fromCyberAesDecrypt },
  'Find / Replace': { toCyber: toCyberFind, fromCyber: fromCyberFind },
  'Regular expression': {
    toCyber: a => goodArray(a, isText, isBool, isBool, isBool, isText) &&
      ['Highlight matches', 'List matches', 'List capture groups', 'List matches with capture groups'].includes(a[4]) ?
      ['User defined', a[0], a[1], a[2], a[3], false, false, false, a[4]] : null,
    fromCyber: a => Array.isArray(a) && a.length === 9 && a[0] === 'User defined' &&
      a[5] === false && a[6] === false && a[7] === false &&
      goodArray([a[1], a[2], a[3], a[4], a[8]], isText, isBool, isBool, isBool, isText) &&
      ['Highlight matches', 'List matches', 'List capture groups', 'List matches with capture groups'].includes(a[8]) ?
      [a[1], a[2], a[3], a[4], a[8]] : null,
  },
  Head: { toCyber: headTailToCyber, fromCyber: headTailFromCyber },
  Tail: { toCyber: headTailToCyber, fromCyber: headTailFromCyber },
  'Drop bytes': { validate: byteArgs },
  'Take bytes': { validate: byteArgs },
  'Extract URLs': {
    // CyberChef also offers Display total and Sort (both omitted locally).
    toCyber: a => goodArray(a, isBool) ? [false, false, a[0]] : null,
    fromCyber: a => goodArray(a, x => x === false, x => x === false, isBool) ? [a[2]] : null,
  },
  Gunzip: { validate: a => goodArray(a) },
  MD5: { validate: a => goodArray(a) },
  SHA1: {
    toCyber: a => goodArray(a) ? [80] : null,
    fromCyber: a => goodArray(a, n => n === 80) ? [] : null,
  },
  SHA3: { validate: a => goodArray(a, valueIn('224', '256', '384', '512')) },
};

function validateArgs(name, args, mods) {
  const m = mods[name];
  if (!m) throw new Error(`Unknown HexSpindle operation: ${name}`);
  if (!Array.isArray(args)) throw new Error(`${name}: arguments must be an array`);
  const specs = m.args || [];
  if (args.length > specs.length) throw new Error(`${name}: ${args.length} arguments provided but only ${specs.length} supported`);
  const full = specs.map((spec, i) => {
    const raw = i < args.length && args[i] !== undefined && args[i] !== null ? args[i] : spec.type === 'toggle' ?
      { option: spec.option, string: spec.value } : spec.value;
    switch (spec.type) {
      case 'number':
        if (typeof raw !== 'number' || !Number.isFinite(raw)) throw new Error(`${name}: ${spec.name} must be a finite number`);
        break;
      case 'boolean':
        if (typeof raw !== 'boolean') throw new Error(`${name}: ${spec.name} must be true or false`);
        break;
      case 'select': {
        const choices = spec.options.flatMap(x => typeof x === 'string' ? [x] : (x.options || []));
        if (!choices.includes(raw)) throw new Error(`${name}: unsupported ${spec.name}: ${raw}`);
        break;
      }
      case 'toggle':
        if (!isRecord(raw) || typeof raw.string !== 'string' || !spec.options.includes(raw.option))
          throw new Error(`${name}: ${spec.name} must be an encoded string with a valid option`);
        return { string: raw.string, option: raw.option };
      case 'string': case 'area': case 'regex': case 'combo': case 'files':
        if (typeof raw !== 'string') throw new Error(`${name}: ${spec.name} must be a string`);
        break;
      default:
        break;
    }
    return raw;
  });
  return full;
}

function cyberArgs(name, args, backwards = false) {
  const mapping = CYBERCHEF[name];
  if (!mapping) {
    throw new Error(`${name}: CyberChef converter mapping is not yet verified (this does not mean CyberChef lacks the operation)`);
  }
  const adapter = backwards ? mapping.fromCyber : mapping.toCyber;
  const translated = adapter ? adapter(args) : args;
  if (!Array.isArray(translated) || (mapping.validate && !mapping.validate(args))) {
    throw new Error(`${name}: this argument configuration is not supported by the converter and cannot be translated faithfully to ${backwards ? 'HexSpindle' : 'CyberChef'}`);
  }
  return translated;
}

function normalizeOperation(row, index, mods, type) {
  let name, args, disabled, breakpoint;
  if (Array.isArray(row)) {
    if (typeof row[0] !== 'string' || !Array.isArray(row[1])) throw new Error(`Step ${index}: invalid compact recipe entry`);
    [name, args] = row;
    disabled = !!row[2]; breakpoint = !!row[3];
  } else if (isRecord(row)) {
    name = type === 'cyberchef' ? row.op : row.module;
    args = row.args;
    disabled = row.disabled; breakpoint = row.breakpoint;
  } else throw new Error(`Step ${index}: expected an operation object`);
  if (typeof name !== 'string' || !name.trim()) throw new Error(`Step ${index}: missing operation name`);
  if (!Array.isArray(args)) throw new Error(`Step ${index} (${name}): args must be an array`);
  try {
    const local = type === 'cyberchef' ? cyberArgs(name, args, true) : args;
    return { module: name, args: validateArgs(name, local, mods), disabled: !!disabled, breakpoint: !!breakpoint };
  } catch (e) { throw new Error(`Step ${index} (${name}): ${e.message}`); }
}

export function normaliseRecipe(source, mods) {
  const rows = Array.isArray(source) ? source : isRecord(source) && Array.isArray(source.recipe) ? source.recipe : null;
  if (!rows) throw new Error('Recipe must be a JSON array of operations');
  if (rows.length > 2000) throw new Error('Recipe is too large (over 2000 operations)');
  const kind = rows.some(x => isRecord(x) && own(x, 'op')) ? 'cyberchef' : 'hexspindle';
  if (rows.some(x => isRecord(x) && (kind === 'cyberchef' ? own(x, 'module') : own(x, 'op'))))
    throw new Error('Mixed HexSpindle and CyberChef entries are not supported');
  const recipe = rows.map((r, i) => normalizeOperation(r, i + 1, mods, kind));
  return { recipe, format: kind };
}

export function exportCyberChef(recipe) {
  if (!Array.isArray(recipe)) throw new Error('Recipe must be an array');
  return recipe.map((op, i) => {
    try {
      if (!op || typeof op.module !== 'string' || !Array.isArray(op.args)) throw new Error('Malformed step');
      const args = cyberArgs(op.module, op.args);
      return { op: op.module, args, ...(op.disabled ? { disabled: true } : {}),
        ...(op.breakpoint ? { breakpoint: true } : {}) };
    } catch (e) { throw new Error(`Step ${i + 1} (${op?.module || '?'}): ${e.message}`); }
  });
}

export function cyberChefPretty(recipe) {
  return recipe.map(op => {
    // Match GCHQ CyberChef Utils.generatePrettyRecipe (including flags).
    const args = JSON.stringify(op.args).slice(1, -1)
      .replace(/'/g, "\\'")
      .replace(/"((?:[^"\\]|\\.)*)"/g, "'$1'")
      .replace(/\\"/g, '"');
    return `${op.op.replace(/ /g, '_')}(${args}${op.disabled ? '/disabled' : ''}${op.breakpoint ? '/breakpoint' : ''})`;
  }).join('\n');
}

function parseChefValues(src) {
  let i = 0;
  const fail = msg => { throw new Error(`${msg} at character ${i + 1}`); };
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  function readString() {
    const quote = src[i++]; let result = '';
    while (i < src.length) {
      const c = src[i++];
      if (c === quote) return result;
      if (c !== '\\') { result += c; continue; }
      if (i >= src.length) fail('Unterminated escape');
      const e = src[i++];
      if (e === 'u' || e === 'x') {
        const digits = e === 'u' ? 4 : 2, h = src.slice(i, i + digits);
        if (!new RegExp(`^[a-fA-F0-9]{${digits}}$`).test(h)) fail('Invalid string escape');
        result += String.fromCharCode(parseInt(h, 16)); i += digits;
      } else {
        const esc = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };
        result += own(esc, e) ? esc[e] : e;
      }
    }
    fail('Unterminated string');
  }
  function value(depth = 0) {
    if (depth > 40) fail('Recipe argument nesting too deep');
    ws(); const c = src[i];
    if (c === '"' || c === "'") return readString();
    if (c === '[') {
      i++; ws(); const a = [];
      if (src[i] === ']') { i++; return a; }
      while (true) { a.push(value(depth + 1)); ws();
        if (src[i] === ']') { i++; return a; }
        if (src[i++] !== ',') fail('Expected comma in list');
      }
    }
    if (c === '{') {
      i++; ws(); const o = Object.create(null);
      if (src[i] === '}') { i++; return o; }
      while (true) {
        ws(); if (src[i] !== '"' && src[i] !== "'") fail('Expected quoted object key');
        const k = readString(); ws(); if (src[i++] !== ':') fail('Expected colon in object');
        o[k] = value(depth + 1); ws();
        if (src[i] === '}') { i++; return o; }
        if (src[i++] !== ',') fail('Expected comma in object');
      }
    }
    const match = /^(?:true|false|null|-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/.exec(src.slice(i));
    if (!match) fail('Expected argument value');
    i += match[0].length;
    return match[0] === 'true' ? true : match[0] === 'false' ? false : match[0] === 'null' ? null : Number(match[0]);
  }
  const steps = [];
  ws();
  while (i < src.length) {
    const m = /^[A-Za-z][A-Za-z0-9_\/-]*/.exec(src.slice(i));
    if (!m) fail('Expected CyberChef operation name');
    i += m[0].length; ws(); if (src[i++] !== '(') fail('Expected opening parenthesis');
    const args = []; let disabled = false, breakpoint = false;
    ws();
    while (src[i] !== ')') {
      if (i >= src.length) fail('Unclosed operation');
      if (src[i] === '/') {
        i++; const f = /^[A-Za-z]+/.exec(src.slice(i)); if (!f) fail('Invalid operation flag');
        i += f[0].length;
        if (f[0] === 'disabled') disabled = true;
        else if (f[0] === 'breakpoint') breakpoint = true;
        else fail(`Unknown operation flag ${f[0]}`);
      } else {
        if (disabled || breakpoint) fail('Arguments must precede operation flags');
        args.push(value()); ws();
        if (src[i] === ',') { i++; ws(); }
        else if (src[i] !== ')' && src[i] !== '/') fail('Expected comma or closing parenthesis');
      }
      ws();
    }
    i++; steps.push({ op: m[0].replace(/_/g, ' '), args, disabled, breakpoint });
    ws();
  }
  return steps;
}

export function parseCyberChefPretty(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Empty CyberChef recipe');
  return parseChefValues(text);
}

const base64 = s => {
  const cleaned = s.replace(/\s/g, '+').replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[a-zA-Z0-9+/]*={0,2}$/.test(cleaned)) throw new Error('Invalid Base64 input in share link');
  const padded = cleaned + '='.repeat((4 - cleaned.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
};

export function parseRecipeText(text, mods) {
  const source = String(text).trim();
  if (!source) throw new Error('Nothing to import');
  let recipeData, inputBytes = null, format;
  // A JSON/pretty argument may itself contain '#recipe='. Only treat actual
  // share links or link fragments as links, not arbitrary occurrence in text.
  const looksLikeLink = /^(?:https?:\/\/|#(?:recipe|r)=|(?:recipe|r)=)/i.test(source);
  const hashPos = looksLikeLink ? source.indexOf('#') : -1;
  const hash = hashPos >= 0 ? source.slice(hashPos + 1) :
    looksLikeLink && /^(?:recipe|r)=/.test(source) ? source : '';
  if (hash && /(?:^|&)\s*(?:recipe|r)=/.test(hash)) {
    // URLSearchParams would replace raw '+' with a space and CORRUPT
    // Base64 alphabets inside CyberChef Chef recipes. Decode %xx only.
    const h = Object.create(null);
    for (const pair of hash.split('&')) {
      const split = pair.indexOf('=');
      if (split < 0) continue;
      const name = pair.slice(0, split);
      if (!Object.prototype.hasOwnProperty.call(h, name))
        h[name] = decodeURIComponent(pair.slice(split + 1));
    }
    if (typeof h.recipe === 'string') {
      recipeData = parseCyberChefPretty(h.recipe);
      format = 'CyberChef link';
      if (typeof h.input === 'string') inputBytes = base64(h.input);
    } else {
      try { recipeData = JSON.parse(new TextDecoder().decode(base64(h.r))); }
      catch (e) { throw new Error('Invalid HexSpindle share link: ' + e.message); }
      format = 'HexSpindle link';
      if (typeof h.i === 'string') inputBytes = base64(h.i);
    }
  } else if (source.startsWith('[') || source.startsWith('{')) {
    try { recipeData = JSON.parse(source); }
    catch (e) { throw new Error('Invalid recipe JSON: ' + e.message); }
  } else {
    recipeData = parseCyberChefPretty(source);
    format = 'CyberChef Chef';
  }
  const parsed = normaliseRecipe(recipeData, mods);
  return { ...parsed, format: format || (parsed.format === 'cyberchef' ? 'CyberChef JSON' : 'HexSpindle JSON'), inputBytes };
}

export function exportRecipeText(recipe, mode, opts = {}) {
  if (mode === 'json') return JSON.stringify(recipe, null, 2);
  const cyber = mode.startsWith('cyber-') ? exportCyberChef(recipe) : null;
  if (mode === 'cyber-json') return JSON.stringify(cyber, null, 2);
  if (mode === 'cyber-chef') return cyberChefPretty(cyber);
  if (mode === 'cyber-link') {
    const input = opts.inputBytes instanceof Uint8Array ?
      '&input=' + encodeURIComponent(opts.toBase64(opts.inputBytes)) : '';
    return 'https://gchq.github.io/CyberChef/#recipe=' +
      encodeURIComponent(cyberChefPretty(cyber).replace(/\n/g, '')) + input;
  }
  if (mode === 'hex-link') {
    const compact = recipe.map(o => [o.module, o.args, o.disabled ? 1 : 0, o.breakpoint ? 1 : 0]);
    const json = new TextEncoder().encode(JSON.stringify(compact));
    const r = opts.toBase64(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const inp = opts.inputBytes instanceof Uint8Array ?
      '&i=' + opts.toBase64(opts.inputBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '') : '';
    return (opts.baseUrl || 'https://hexspindle.github.io/').split('#')[0] + '#r=' + r + inp;
  }
  throw new Error('Unknown recipe export format: ' + mode);
}
