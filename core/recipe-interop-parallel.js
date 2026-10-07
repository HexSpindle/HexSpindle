import * as base from './recipe-interop.js';

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isRecord = x => !!x && typeof x === 'object' && !Array.isArray(x);

function rawRows(source) {
  return Array.isArray(source) ? source : isRecord(source) && Array.isArray(source.recipe) ? source.recipe : null;
}

function parallelFlag(row) {
  return Array.isArray(row) ? !!row[4] : !!row?.parallel;
}

function compatible(mods, a, b) {
  const ma = mods[a?.module], mb = mods[b?.module];
  return !!ma?.parallelSafe && !!mb?.parallelSafe && !!ma.parallelGroup && ma.parallelGroup === mb.parallelGroup;
}

function applyParallel(parsed, rows, mods) {
  if (!rows) return parsed;
  parsed.recipe.forEach((op, i) => { op.parallel = parallelFlag(rows[i]); });
  parsed.recipe.forEach((op, i) => {
    if (!op.parallel) return;
    if (i === 0 || !compatible(mods, parsed.recipe[i - 1], op)) {
      throw new Error(`Step ${i + 1} (${op.module}): invalid parallel link; the operation above is not parallel-compatible`);
    }
  });
  return parsed;
}

export function normaliseRecipe(source, mods) {
  const parsed = base.normaliseRecipe(source, mods);
  // CyberChef has no HexSpindle parallel-group representation.
  if (parsed.format === 'cyberchef') return parsed;
  return applyParallel(parsed, rawRows(source), mods);
}

export function exportCyberChef(recipe) {
  const i = recipe.findIndex(op => op?.parallel);
  if (i >= 0) throw new Error(`Step ${i + 1} (${recipe[i].module}): parallel groups cannot be represented faithfully in a CyberChef recipe`);
  return base.exportCyberChef(recipe);
}

export const cyberChefPretty = base.cyberChefPretty;
export const parseCyberChefPretty = base.parseCyberChefPretty;

function b64decode(s) {
  const cleaned = s.replace(/\s/g, '+').replace(/-/g, '+').replace(/_/g, '/');
  const padded = cleaned + '='.repeat((4 - cleaned.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function linkParams(source) {
  const looksLikeLink = /^(?:https?:\/\/|#(?:recipe|r)=|(?:recipe|r)=)/i.test(source);
  const hashPos = looksLikeLink ? source.indexOf('#') : -1;
  const hash = hashPos >= 0 ? source.slice(hashPos + 1) : looksLikeLink && /^(?:recipe|r)=/.test(source) ? source : '';
  if (!hash) return null;
  const out = Object.create(null);
  for (const pair of hash.split('&')) {
    const p = pair.indexOf('=');
    if (p < 0) continue;
    const name = pair.slice(0, p);
    if (!own(out, name)) out[name] = decodeURIComponent(pair.slice(p + 1));
  }
  return out;
}

export function parseRecipeText(text, mods) {
  const source = String(text).trim();
  const params = linkParams(source);
  if (params?.r) {
    try {
      const raw = JSON.parse(new TextDecoder().decode(b64decode(params.r)));
      const parsed = normaliseRecipe(raw, mods);
      return { ...parsed, format: 'HexSpindle link', inputBytes: typeof params.i === 'string' ? b64decode(params.i) : null };
    } catch (e) {
      throw new Error('Invalid HexSpindle share link: ' + e.message);
    }
  }
  if (source.startsWith('[') || source.startsWith('{')) {
    let raw;
    try { raw = JSON.parse(source); } catch (e) { throw new Error('Invalid recipe JSON: ' + e.message); }
    const parsed = normaliseRecipe(raw, mods);
    return { ...parsed, format: parsed.format === 'cyberchef' ? 'CyberChef JSON' : 'HexSpindle JSON', inputBytes: null };
  }
  return base.parseRecipeText(text, mods);
}

export function exportRecipeText(recipe, mode, opts = {}) {
  if (mode === 'json') return JSON.stringify(recipe, null, 2);
  if (mode.startsWith('cyber-')) {
    exportCyberChef(recipe); // reject parallel groups before delegating
    return base.exportRecipeText(recipe, mode, opts);
  }
  if (mode === 'hex-link') {
    const compact = recipe.map(o => [o.module, o.args, o.disabled ? 1 : 0, o.breakpoint ? 1 : 0, o.parallel ? 1 : 0]);
    const json = new TextEncoder().encode(JSON.stringify(compact));
    const r = opts.toBase64(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const inp = opts.inputBytes instanceof Uint8Array
      ? '&i=' + opts.toBase64(opts.inputBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      : '';
    return (opts.baseUrl || 'https://hexspindle.github.io/').split('#')[0] + '#r=' + r + inp;
  }
  return base.exportRecipeText(recipe, mode, opts);
}
