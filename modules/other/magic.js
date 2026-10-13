import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';
import { search, verdict, entropy } from '../../core/magic.js';
import { decodeUtf8, encodeUtf8, base64Encode } from '../../core/util.js';

function pyRepr(s) {
  const hasSingle = s.includes("'"), hasDouble = s.includes('"');
  const quote = hasSingle && !hasDouble ? '"' : "'";
  let out = quote;
  for (const ch of s) {
    if (ch === '\\') out += '\\\\';
    else if (ch === quote) out += '\\' + quote;
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else out += ch;
  }
  return out + quote;
}

// One byte per character when every character fits in a byte, otherwise UTF-8.
function strToBytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 255) return new TextEncoder().encode(s);
    out[i] = c;
  }
  return out;
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const barColour = score => `hsl(${Math.round(Math.max(0, Math.min(100, score)) * 1.2)},72%,42%)`;
const size = n => n === 1 ? '1 byte' : `${n.toLocaleString('en-US')} bytes`;

// Text results are shown as text, everything else as a short hex dump.
function preview(u8, isText, max) {
  if (!isText) {
    const head = [...u8.subarray(0, Math.floor(max / 3))].map(b => b.toString(16).padStart(2, '0')).join(' ');
    return head + (u8.length > max / 3 ? ' …' : '');
  }
  const text = [...decodeUtf8(u8.subarray(0, max * 4))].map(ch => {
    const c = ch.codePointAt(0);
    return c === 10 ? '⏎' : c === 13 ? '' : c === 9 ? '→' : c < 32 || (c >= 127 && c < 160) || c === 0xfffd ? '·' : ch;
  });
  return text.slice(0, max).join('') + (text.length > max || u8.length > max * 4 ? ' …' : '');
}

const STYLE = '<style>'
  + '.mg{font:13px/1.45 ui-monospace,Consolas,monospace;max-width:980px}'
  + '.mg-h{opacity:.8;margin:0 0 10px}'
  + '.mg-note{border-left:3px solid hsl(40,90%,50%);background:rgba(240,180,40,.13);padding:5px 10px;margin:0 0 10px}'
  + '.mg-c{border:1px solid rgba(128,150,190,.45);border-radius:8px;padding:10px 12px;margin:0 0 10px}'
  + '.mg-top{display:flex;align-items:center;gap:10px}'
  + '.mg-rank{font-weight:700;min-width:28px}'
  + '.mg-bar{flex:1;height:14px;border-radius:7px;background:rgba(128,128,128,.24);overflow:hidden}'
  + '.mg-bar i,.mg-mini i{display:block;height:100%;border-radius:7px}'
  + '.mg-pct{font-weight:700;min-width:150px;text-align:right}'
  + '.mg-chain{margin:8px 0 4px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}'
  + '.mg-op{border:1px solid rgba(128,150,190,.6);border-radius:12px;padding:1px 9px;font-weight:600}'
  + '.mg-tag{border-radius:4px;padding:0 6px;font-size:11px;background:rgba(128,150,190,.25)}'
  + '.mg-meta{opacity:.8;font-size:12px}'
  + '.mg-pre{margin:6px 0 0;padding:6px 8px;border-radius:6px;background:rgba(128,128,128,.15);white-space:pre-wrap;word-break:break-all;max-height:6em;overflow:hidden}'
  + '.mg-st{margin:8px 0 0;font-size:12px}'
  + '.mg-s{border-top:1px solid rgba(128,150,190,.3);padding:5px 0 3px}'
  + '.mg-s b{margin-right:8px}.mg-s span.k{opacity:.8}'
  + '.mg-s div{opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.mg-mini{display:inline-block;width:64px;height:8px;border-radius:4px;background:rgba(128,128,128,.24);overflow:hidden;vertical-align:middle;margin-right:6px}'
  + '.mg-foot{opacity:.7;font-size:12px}'
  + '</style>';

function card(r, rank) {
  const chain = r.stages.length
    ? r.stages.map((s, i) => `${i ? '<span>→</span>' : ''}<span class="mg-op">${esc(s.label)}</span>`).join('')
    : '<span class="mg-op">Input as-is (no decoding)</span>';
  const tags = (r.matchesCrib ? ' <span class="mg-tag">matches crib</span>' : '') + (r.intermediate ? ' <span class="mg-tag">intermediate layer, decodes further</span>' : '');
  // Each stage shows what the data looked like after that step, so a multi-stage chain can be followed layer by layer.
  const stages = r.stages.length < 2 ? '' : '<div class="mg-st">' + r.stages.map((s, i) =>
    `<div class="mg-s"><b>Stage ${i + 1} · ${esc(s.label)}</b>`
    + `<span class="mg-mini"><i style="width:${s.quality}%;background:${barColour(s.quality)}"></i></span><span class="k">${esc(s.kind)}, ${size(s.data.length)}</span>`
    + `<div>${esc(preview(s.data, s.text, 96))}</div></div>`).join('') + '</div>';
  return '<div class="mg-c">'
    + `<div class="mg-top"><span class="mg-rank">#${rank}</span><div class="mg-bar"><i style="width:${Math.max(1, r.score)}%;background:${barColour(r.score)}"></i></div>`
    + `<span class="mg-pct">${r.score.toFixed(1)}% · ${verdict(r.score)}</span></div>`
    + `<div class="mg-chain">${chain}</div>`
    + `<div class="mg-meta">Result: ${esc(r.kind)} · ${size(r.data.length)} · entropy ${entropy(r.data.subarray(0, 65536)).toFixed(2)} bits/byte${tags}</div>`
    + `<div class="mg-pre">${esc(preview(r.data, r.text, 240))}</div>${stages}</div>`;
}

function graphical(data, results, top, depth) {
  const root = results.find(r => !r.path.length), shown = results.slice(0, top);
  const decoded = results.filter(r => r.path.length);
  // The output is rendered in a sandboxed frame that cannot run scripts, so the app reads the very likely
  // recipes from this marker and offers them as "Add to recipe" buttons above the frame.
  const likely = decoded.filter(r => r.score >= 80).slice(0, 3).map(r => ({ score: r.score, label: r.stages.map(s => s.label).join(' → '), recipe: r.path }));
  let html = `<!--hexspindle-magic:${base64Encode(encodeUtf8(JSON.stringify(likely)))}-->${STYLE}<div class="mg"><div class="mg-h">Magic · input ${size(data.length)} · entropy ${entropy(data.subarray(0, 65536)).toFixed(2)} bits/byte · looks like: ${esc(root.kind)}</div>`;
  for (const hint of root.hints || []) html += `<div class="mg-note">${esc(hint)}</div>`;
  if (!decoded.length) html += '<div class="mg-note">No decoding was found for this input.</div>';
  else if (decoded[0].score < 40 && root.score >= decoded[0].score) html += '<div class="mg-note">No convincing decoding was found; the input is most likely already in its final form.</div>';
  html += shown.map((r, i) => card(r, i + 1)).join('');
  html += `<div class="mg-foot">Showing ${shown.length} of ${results.length} candidates, searched up to ${depth} stage${depth === 1 ? '' : 's'} deep. `
    + 'Bars run from red (unlikely) to green (very likely) and combine how well the data fits each encoding with how meaningful the result is.'
    + (root.truncated ? ' The search stopped at its operation or time budget, so deeper chains may be missing.' : '') + '</div></div>';
  return new Html(html);
}

let ccMagicPromise = null;

module('Magic', 'Detects how the input is encoded or compressed and suggests the operations that decode it, following several stages when layers are nested (for example Base64 → Gunzip → Hex). '
  + 'Each candidate gets a confidence score from how well the data fits the encoding and how meaningful the result is (readable text, valid UTF-8, JSON / XML, known file types, entropy). '
  + '"Graphical" shows the candidates with red-to-green confidence bars and a stage-by-stage breakdown; "Ranked list" gives the same ranking as plain text; "Options (JSON)" gives the full option list as JSON.',
  [A.number('Depth', 3, 1, 6), A.boolean('Intensive mode (1-byte XOR brute force)', false), A.string('Crib (regex)', ''), A.number('Show top', 8, 1, 30),
    A.boolean('Extensive language support', false), A.select('Output', ['Graphical', 'Ranked list', 'Options (JSON)'])],
  async (data, depth, intensive, crib, top, extLang = false, output = 'Graphical') => {
    if (output !== 'Options (JSON)') {
      depth = Math.max(1, Math.trunc(depth) || 3); top = Math.max(1, Math.trunc(top) || 8);
      const res = await search(data, depth, intensive, crib || null);
      if (output === 'Graphical') return graphical(data, res, top, depth);
      const lines = [];
      for (const { data: out, stages, score: sc, kind } of res.slice(0, top)) {
        const chain = stages.map(s => s.label).join(' → ') || '(input as-is)';
        const snippet = decodeUtf8(out.subarray(0, 70)).replace(/\n/g, '⏎');
        lines.push(`[${sc.toFixed(1).padStart(6)}] ${chain}  (${kind})\n         ${pyRepr(snippet)}`);
      }
      return lines.join('\n');
    }
    if (!ccMagicPromise) ccMagicPromise = import('./_magic_lib.mjs').then(m => m.MagicLib);
    const MagicLib = await ccMagicPromise;
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const cribRegex = crib && crib.length ? new RegExp(crib, 'i') : null;
    let options = await new MagicLib(buf).speculativeExecution(depth, extLang, intensive, [], false, cribRegex);
    if (cribRegex) options = options.filter(o => o.matchesCrib);
    return strToBytes(JSON.stringify(options, null, 4));
  });
