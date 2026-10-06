import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';

module('Frequency distribution', 'Counts how often each byte value occurs. The default output is the data as JSON (data length, percentages, distribution, bytes represented); pick Chart or Text table for a rendered view.',
  [A.boolean('Show 0%s', true), A.select('Output', ['Data (JSON)', 'Chart', 'Text table'])],
  (data, zeros, fmt) => {
    if (fmt === 'Data (JSON)') {
      if (!data.length) throw new Error('No data');
      const distribution = new Array(256).fill(0);
      for (const b of data) distribution[b]++;
      const percentages = distribution.map(c => c / data.length * 100);
      return JSON.stringify({ dataLength: data.length, percentages, distribution, bytesRepresented: distribution.filter(c => c > 0).length }, null, 4);
    }
    const counts = new Array(256).fill(0);
    for (const b of data) counts[b]++;
    const n = Math.max(data.length, 1);
    const rows = [];
    for (let i = 0; i < 256; i++) if (zeros || counts[i]) rows.push([i, counts[i]]);
    if (fmt === 'Text table') {
      const lines = rows.map(([i, k]) => `0x${i.toString(16).padStart(2, '0')}  ${(i > 32 && i < 127 ? String.fromCharCode(i) : '.').padEnd(4)}  ${String(k).padEnd(5)}  ${(k / n * 100).toFixed(2)}%`);
      return 'Byte  Char  Count  Percent\n' + lines.join('\n');
    }
    const mx = (rows.length ? Math.max(...rows.map(([, k]) => k)) : 1) || 1;
    const w = Math.max(rows.length, 1) * 8;
    let bars = '';
    rows.forEach(([i, k], j) => {
      const ch = (i > 32 && i < 127) ? String.fromCharCode(i) : '.';
      bars += `<rect x="${j * 8}" y="${(170 - k / mx * 160).toFixed(1)}" width="6" height="${(k / mx * 160).toFixed(1)}" fill="#38f2ff"><title>0x${i.toString(16).padStart(2, '0')} (${ch}): ${k} (${(k / n * 100).toFixed(2)}%)</title></rect>`;
      bars += `<text x="${j * 8 + 3}" y="182" font-size="6" fill="#7aa2c8" text-anchor="middle">${i.toString(16).padStart(2, '0')}</text>`;
    });
    return new Html(`<svg viewBox="0 0 ${w} 190" style="width:100%;background:#0a1020;border:1px solid #1f3a5f">${bars}</svg>`);
  });
