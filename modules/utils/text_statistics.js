import { module } from './_cat.js';

module('Text Statistics', 'Word/line/char counts, average word length, most frequent words and a basic readability score.', [],
  (t) => {
    const lines = t.split('\n');
    const words = t.match(/[A-Za-z']+/g) || [];
    const trimmed = t.trim();
    const sentences = (trimmed ? trimmed.split(/[.!?]+\s/) : []).filter(s => s.trim());
    const chars = t.length;
    const charsNoWS = t.replace(/\s/g, '').length;
    const freq = new Map();
    for (const w of words) { const k = w.toLowerCase(); freq.set(k, (freq.get(k) || 0) + 1); }
    const syll = words.reduce((sum, w) => sum + Math.max(1, (w.match(/[aeiouyAEIOUY]+/g) || []).length), 0);
    const flesch = words.length ? 206.835 - 1.015 * (words.length / Math.max(sentences.length, 1)) - 84.6 * (syll / Math.max(words.length, 1)) : 0;
    const out = [
      `Characters: ${chars} (${charsNoWS} excluding whitespace)`,
      `Words: ${words.length}`,
      `Lines: ${lines.length}`,
      `Sentences (approx.): ${sentences.length}`,
      words.length ? `Average word length: ${(words.reduce((s, w) => s + w.length, 0) / words.length).toFixed(2)}` : 'Average word length: 0',
      `Average words per sentence: ${(words.length / Math.max(sentences.length, 1)).toFixed(1)}`,
      `Flesch Reading Ease (approx.): ${flesch.toFixed(1)}  (${flesch > 90 ? 'very easy' : flesch > 70 ? 'easy' : flesch > 50 ? 'standard' : flesch > 30 ? 'difficult' : 'very difficult'})`,
      '', 'Top 10 words:',
    ];
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    out.push(...sorted.slice(0, 10).map(([w, n]) => `  ${w}: ${n}`));
    return out.join('\n');
  }, { text: true });
