import { MODULES, Html } from './registry.js';
import { toBytes, encodeUtf8, decodeUtf8, concatBytes, delim, reFlags } from './util.js';

export const BLOCK_OPEN = ['Fork', 'Subsection'];
export const FLOW_NAMES = new Set([...BLOCK_OPEN, 'Merge', 'Jump', 'Conditional Jump', 'Label', 'Return', 'Register', 'Comment']);

export class RecipeError extends Error {}
class ReturnSignal { constructor(data) { this.data = data; } }

function subst(s, regs) {
  if (regs.size && s.includes('$R')) return s.replace(/\$R(\d+)/g, (m, g) => regs.has(+g) ? regs.get(+g) : m);
  return s;
}

function resolveArgs(mod, raw, regs) {
  raw = raw || [];
  const out = [];
  mod.args.forEach((spec, i) => {
    let v = i < raw.length && raw[i] !== null && raw[i] !== undefined ? raw[i] : undefined;
    switch (spec.type) {
      case 'toggle': {
        if (typeof v !== 'object' || v === null || Array.isArray(v)) v = { string: v === undefined ? spec.value : v, option: spec.option };
        const s = subst(String(v.string ?? ''), regs);
        out.push(toBytes(s, v.option || spec.option));
        break;
      }
      case 'number': {
        if (v === undefined || v === '') v = spec.value;
        const f = Number(v);
        if (Number.isNaN(f)) throw new RecipeError(`Argument '${spec.name}' must be a number`);
        out.push(f);
        break;
      }
      case 'boolean':
        out.push(v === undefined ? spec.value : !!v);
        break;
      case 'select':
        out.push(v === undefined ? spec.value : String(v));
        break;
      default: // string, area, regex, combo
        out.push(subst(v === undefined ? spec.value : String(v), regs));
    }
  });
  return out;
}

function toOutputBytes(res) {
  if (res instanceof Html) return [encodeUtf8(res.toString()), true];
  if (typeof res === 'string') return [encodeUtf8(res), false];
  if (res instanceof Uint8Array) return [res, false];
  if (res instanceof ArrayBuffer) return [new Uint8Array(res), false];
  if (Array.isArray(res)) return [encodeUtf8(res.map(String).join('\n')), false];
  if (res === null || res === undefined) return [new Uint8Array(0), false];
  if (typeof res === 'object') return [encodeUtf8(JSON.stringify(res, null, 2)), false];
  return [encodeUtf8(String(res)), false];
}

export async function callModule(mod, data, args) {
  const input = mod.text ? decodeUtf8(data) : data;
  const res = await mod.func(input, ...args);
  return toOutputBytes(res);
}
export { resolveArgs };

function findBlockEnd(ops, i) {
  let depth = 1, j = i + 1;
  while (j < ops.length) {
    if (!ops[j].disabled) {
      const n = ops[j].module;
      if (BLOCK_OPEN.includes(n)) depth++;
      else if (n === 'Merge') { depth--; if (depth === 0) return j; }
    }
    j++;
  }
  return ops.length;
}

function preview(data, n = 240) {
  return decodeUtf8(data.subarray(0, n));
}

class Ctx {
  constructor(upto) {
    this.regs = new Map(); this.steps = {}; this.html = false;
    this.upto = upto; this.pausedAt = null; this.error = null; this.last = null;
  }
}

export async function runOps(data, ops, ctx, top = false, offset = 0) {
  const labels = {};
  ops.forEach((op, idx) => { if (op.module === 'Label' && !op.disabled) labels[String((op.args || [])[0] || '').trim()] = idx; });
  const jumps = {};
  let i = 0;
  while (i < ops.length) {
    const op = ops[i];
    const gi = offset + i;
    if (top && ctx.upto !== null && ctx.upto !== undefined && gi > ctx.upto) break;
    if (top && op.breakpoint && !op.disabled && (ctx.upto === null || ctx.upto === undefined) && ctx.pausedAt === null) { ctx.pausedAt = gi; break; }
    if (op.disabled) { if (top) ctx.steps[gi] = { skipped: true }; i++; continue; }
    const name = op.module;
    const mod = MODULES[name];
    if (!mod) throw new RecipeError(`Unknown module: ${name}`);
    const t0 = performance.now();
    if (BLOCK_OPEN.includes(name)) {
      const end = findBlockEnd(ops, i);
      const args = resolveArgs(mod, op.args, ctx.regs);
      data = await runBlock(name, data, ops.slice(i + 1, end), args, ctx, offset + i + 1);
      if (top) {
        for (let k = i; k < Math.min(end + 1, ops.length); k++) ctx.steps[offset + k] = { ms: 0, size: data.length, inblock: k !== i };
        ctx.steps[gi].ms = +(performance.now() - t0).toFixed(2);
        ctx.steps[gi].preview = preview(data);
      }
      i = end + 1; continue;
    }
    if (name === 'Merge' || name === 'Comment' || name === 'Label') {
      if (top) ctx.steps[gi] = { ms: 0, size: data.length, preview: preview(data) };
      i++; continue;
    }
    if (name === 'Return') { if (top) ctx.steps[gi] = { ms: 0, size: data.length }; throw new ReturnSignal(data); }
    if (name === 'Jump' || name === 'Conditional Jump') {
      const a = resolveArgs(mod, op.args, ctx.regs);
      let label, maxj, doJump;
      if (name === 'Jump') { [label, maxj, doJump] = [a[0], a[1] | 0, true]; }
      else {
        const [rx, invert, lbl, mj] = a;
        const txt = decodeUtf8(data);
        doJump = rx ? (!!txt.match(new RegExp(rx, reFlags())) !== !!invert) : true;
        label = lbl; maxj = mj | 0;
      }
      if (top) ctx.steps[gi] = { ms: 0, size: data.length, preview: preview(data) };
      const lkey = label.trim();
      if (doJump && lkey in labels && (jumps[i] || 0) < maxj) { jumps[i] = (jumps[i] || 0) + 1; i = labels[lkey]; continue; }
      i++; continue;
    }
    if (name === 'Register') {
      const a = resolveArgs(mod, op.args, ctx.regs);
      const txt = decodeUtf8(data);
      const m = txt.match(new RegExp(a[0], reFlags(a[1], a[2], a[3])));
      if (m) { const groups = m.length > 1 ? m.slice(1) : [m[0]]; groups.forEach((g, gi2) => ctx.regs.set(gi2, g || '')); }
      if (top) ctx.steps[gi] = { ms: 0, size: data.length, preview: preview(data), regs: m ? Object.fromEntries([...ctx.regs].map(([k, v]) => [`$R${k}`, v])) : { '': 'no match' } };
      i++; continue;
    }
    try {
      const args = resolveArgs(mod, op.args, ctx.regs);
      let html;
      [data, html] = await callModule(mod, data, args);
      ctx.html = html;
    } catch (e) {
      if (e instanceof ReturnSignal) throw e;
      const msg = e.message ? `${e.name || 'Error'}: ${e.message}` : (e.name || 'Error');
      if (top) ctx.steps[gi] = { error: msg, ms: +(performance.now() - t0).toFixed(2) };
      ctx.error = { step: gi, module: name, message: msg };
      throw new RecipeError(`${name}: ${msg}`);
    }
    if (top) { ctx.steps[gi] = { ms: +(performance.now() - t0).toFixed(2), size: data.length, preview: preview(data) }; ctx.last = data; }
    i++;
  }
  return data;
}

async function runBlock(kind, data, sub, args, ctx, offset) {
  const ignore = kind === 'Fork' ? args[2] : args[4];
  async function runSub(piece) {
    try { return await runOps(piece, sub, ctx, false, offset); }
    catch (e) {
      if (e instanceof ReturnSignal) return e.data;
      if (e instanceof RecipeError) { if (ignore) return piece; throw e; }
      throw e;
    }
  }
  if (kind === 'Fork') {
    const [splitD, mergeD] = [delim(args[0]), delim(args[1])];
    const txt = decodeUtf8(data);
    const pieces = splitD ? txt.split(splitD) : [...txt];
    const outs = [];
    for (const p of pieces) outs.push(await runSub(encodeUtf8(p)));
    return concatBytes(outs.flatMap((o, idx) => idx ? [encodeUtf8(mergeD), o] : [o]));
  }
  const [rx, ci, mlt, dot] = args;
  const txt = decodeUtf8(data);
  const re = new RegExp(rx, reFlags(ci, mlt, dot) + 'g');
  const out = []; let last = 0, m;
  while ((m = re.exec(txt)) !== null) {
    out.push(encodeUtf8(txt.slice(last, m.index)));
    out.push(await runSub(encodeUtf8(m[0])));
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  out.push(encodeUtf8(txt.slice(last)));
  return concatBytes(out);
}

export async function bake(data, recipe, upto = null) {
  const ctx = new Ctx(upto);
  const t0 = performance.now();
  let out = data, err = null;
  try {
    out = await runOps(data, recipe, ctx, true);
  } catch (e) {
    if (e instanceof ReturnSignal) out = e.data;
    else if (e instanceof RecipeError) { err = ctx.error || { step: null, message: e.message }; out = ctx.last !== null ? ctx.last : data; }
    else throw e;
  }
  return { output: out, html: ctx.html, steps: ctx.steps, error: err, pausedAt: ctx.pausedAt, ms: +(performance.now() - t0).toFixed(2), size: out.length };
}
