/* HexSpindle <-> CyberChef recipe interchange.
 * Only mappings checked against the CyberChef operation definitions are allowed.
 * Never silently skip or reinterpret unsupported operations.
 */

const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
const isRecord = x => !!x && typeof x === 'object' && !Array.isArray(x);
const knownDelimiters = new Set(['Space', 'Comma', 'Semi-colon', 'Colon', 'Line feed', 'CRLF', 'None', '0x', '0x with comma', '\\x']);
const validBase64Alphabet = x => typeof x === 'string' && x.length > 0;
const compatibleKey = key => isRecord(key) && typeof key.string === 'string' && ['Hex', 'UTF8', 'Latin1', 'Base64'].includes(key.option);

// Maps only verified CyberChef operations/argument configurations. Some other
// same-named operations in the two products have DIFFERENT semantics.
const CYBERCHEF = {
  'To Base64': {
    validate: args => args.length === 1 && validBase64Alphabet(args[0]),
  },
  'From Base64': {
    validate: args => args.length === 3 && validBase64Alphabet(args[0]) &&
      typeof args[1] === 'boolean' && typeof args[2] === 'boolean',
  },
  'To Hex': {
    validate: args => args.length === 2 && knownDelimiters.has(args[0]) &&
      Number.isInteger(args[1]) && args[1] >= 0,
  },
  'From Hex': {
    validate: args => args.length === 1 &&
      ['Auto', ...knownDelimiters, 'Percent'].includes(args[0]),
  },
  ROT13: {
    validate: args => args.length === 4 && typeof args[0] === 'boolean' &&
      typeof args[1] === 'boolean' && typeof args[2] === 'boolean' &&
      Number.isInteger(args[3]) && args[3] >= 0,
  },
  'URL Encode': {
    validate: args => args.length === 1 && typeof args[0] === 'boolean',
  },
  'Remove null bytes': { validate: args => args.length === 0 },
  'URL Decode': {
    // CyberChef has a '+' toggle; HexSpindle always treats '+' as space.
    toCyber: args => args.length === 0 ? [true] : null,
    fromCyber: args => args.length === 1 && args[0] === true ? [] : null,
  },
  Reverse: {
    // 'Line' differs for some trailing-line/CRLF combinations.
    validate: args => args.length === 1 && ['Byte', 'Character'].includes(args[0]),
  },
  XOR: {
    // Differential/Cascade modes are not identical between implementations.
    validate: args => args.length === 3 && compatibleKey(args[0]) &&
      args[1] === 'Standard' && typeof args[2] === 'boolean',
  },
  Gunzip: { validate: args => args.length === 0 },
  MD5: { validate: args => args.length === 0 },
  SHA1: {
    // CyberChef SHA1 offers a Rounds option; 80 is the standard SHA-1.
    toCyber: args => args.length === 0 ? [80] : null,
    fromCyber: args => args.length === 1 && args[0] === 80 ? [] : null,
  },
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
  const m = CYBERCHEF[name];
  if (!m) throw new Error(`${name}: CyberChef conversion is not yet verified for this operation`);
  const x = backwards ? (m.fromCyber ? m.fromCyber(args) : args) : (m.toCyber ? m.toCyber(args) : args);
  if (!x || (!backwards || !m.fromCyber) && m.validate && !m.validate(args))
    throw new Error(`${name}: this argument configuration is not supported by the CyberChef converter`);
  return x;
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
    const m = /^[A-Za-z][A-Za-z0-9_]*/.exec(src.slice(i));
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
