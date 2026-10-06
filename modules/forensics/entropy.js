import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';

function shannon(u8) {
  if (!u8.length) return 0;
  const counts = new Array(256).fill(0);
  for (const b of u8) counts[b]++;
  let e = 0;
  for (const c of counts) { if (c > 0) { const p = c / u8.length; e += p * Math.log(p) / Math.log(2); } }
  return -e || 0;
}

module('Entropy', "Shannon entropy of the input. 'Shannon scale' gives the bare value; 'Report' adds a verdict, and there are block-entropy and histogram visualisations.",
  [A.select('Visualisation', ['Shannon scale', 'Block entropy', 'Histogram (byte frequency)', 'Number only', 'Report']), A.number('Block size', 256, 16)],
  (data, vis, block) => {
    const e = shannon(data);
    if (vis === 'Number only' || vis === 'Shannon scale') return String(e);
    if (vis === 'Report') {
      const verdict = e > 7.5 ? 'Very high (likely compressed or encrypted)' : e > 6.5 ? 'High (packed/compressed?)' : e > 4.5 ? 'Medium (code / mixed data)' : e > 1 ? 'Low (text / structured)' : 'Very low (repetitive)';
      return `Shannon entropy: ${e.toFixed(6)} bits/byte (max 8)\nScale: ${verdict}`;
    }
    if (vis === 'Block entropy') {
      const vals = [];
      for (let i = 0; i < Math.max(data.length, 1); i += block) vals.push(shannon(data.subarray(i, i + block)));
      const w = 720, h = 200, n = vals.length;
      const pts = vals.map((v, i) => `${((i / Math.max(n - 1, 1)) * w).toFixed(1)},${(h - v / 8 * h).toFixed(1)}`).join(' ');
      return new Html(`<div style="font:12px monospace;margin-bottom:6px">Overall: ${e.toFixed(4)} bits/byte &nbsp; blocks: ${n} × ${block}B</div>`
        + `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:${w}px;background:#0a1020;border:1px solid #1f3a5f"><polyline fill="none" stroke="#38f2ff" stroke-width="1.5" points="${pts}"/>`
        + `<line x1="0" x2="${w}" y1="${h - 7.5 / 8 * h}" y2="${h - 7.5 / 8 * h}" stroke="#ff4d8d" stroke-dasharray="4"/></svg>`);
    }
    const counts = new Array(256).fill(0);
    for (const b of data) counts[b]++;
    const mx = Math.max(...counts, 1);
    let bars = '';
    for (let i = 0; i < 256; i++) { const c = counts[i]; bars += `<rect x="${i * 2.8}" y="${(200 - c / mx * 200).toFixed(1)}" width="2.6" height="${(c / mx * 200).toFixed(1)}" fill="#38f2ff"/>`; }
    return new Html(`<div style="font:12px monospace;margin-bottom:6px">Entropy: ${e.toFixed(4)} bits/byte</div><svg viewBox="0 0 720 200" style="width:100%;max-width:720px;background:#0a1020;border:1px solid #1f3a5f">${bars}</svg>`);
  });
