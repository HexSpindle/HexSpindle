import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeLatin1 } from '../../core/util.js';
import { streamTransform } from '../compression/_streams.js';

// Finds every "stream … endstream" in a PDF, decodes the common filters (FlateDecode, ASCIIHexDecode,
// ASCII85Decode, LZW left as-is), and lists or extracts them. This is how you read the actual content —
// page text, fonts, JavaScript, embedded files — that a PDF keeps compressed.
function ascii85(text) {
  const body = text.replace(/\s/g, '').replace(/^<~/, '').replace(/~>$/, '');
  const out = [];
  for (let i = 0; i < body.length;) {
    if (body[i] === 'z') { out.push(0, 0, 0, 0); i++; continue; }
    let group = 0, n = 0;
    for (; n < 5 && i < body.length; n++, i++) { const c = body.charCodeAt(i) - 33; if (c < 0 || c > 84) break; group = group * 85 + c; }
    for (let k = n; k < 5; k++) group = group * 85 + 84;
    const bytes = [(group >>> 24) & 255, (group >>> 16) & 255, (group >>> 8) & 255, group & 255];
    for (let k = 0; k < n - 1; k++) out.push(bytes[k]);
  }
  return Uint8Array.from(out);
}
const asciiHex = text => { const h = text.replace(/[^0-9a-fA-F]/g, ''); return Uint8Array.from((h.length % 2 ? h + '0' : h).match(/../g) || [], x => parseInt(x, 16)); };

async function decodeStream(raw, filters) {
  let bytes = raw;
  for (const f of filters) {
    if (/FlateDecode|Fl/.test(f)) bytes = await streamTransform(bytes, 'deflate', 'decompress').catch(() => streamTransform(bytes, 'deflate-raw', 'decompress'));
    else if (/ASCIIHexDecode|AHx/.test(f)) bytes = asciiHex(decodeLatin1(bytes));
    else if (/ASCII85Decode|A85/.test(f)) bytes = ascii85(decodeLatin1(bytes));
    else return { bytes, note: `filter ${f} not supported; shown still encoded` };
  }
  return { bytes };
}

async function collect(text, raw) {
  const streams = [];
  const re = /(\d+)\s+\d+\s+obj\b([\s\S]*?)\bstream(\r\n|\r|\n)/g;
  let m;
  while ((m = re.exec(text))) {
    const dict = m[2];
    const start = m.index + m[0].length;
    const end = text.indexOf('endstream', start);
    if (end < 0) continue;
    let stop = end; while (stop > start && (text[stop - 1] === '\n' || text[stop - 1] === '\r')) stop--;
    const filters = [...dict.matchAll(/\/(FlateDecode|ASCIIHexDecode|ASCII85Decode|LZWDecode|RunLengthDecode|DCTDecode|Fl|AHx|A85)\b/g)].map(x => x[1]);
    streams.push({ obj: m[1], filters, dict: dict.trim().replace(/\s+/g, ' ').slice(0, 120), raw: raw.subarray(start, stop) });
  }
  return streams;
}

module('Extract PDF Streams',
  'Finds the stream objects in a PDF and decodes the common filters (FlateDecode, ASCIIHexDecode, ASCII85Decode) so you can read the compressed content — page text, fonts, JavaScript or embedded files. '
  + 'Lists every stream with its object number, filters and decoded size, or extracts one by number. Nothing in the PDF is executed.',
  [A.number('Stream to extract (0 = list all)', 0)],
  async (data, which) => {
    const text = decodeLatin1(data);
    if (!/%PDF-/.test(text.slice(0, 1024))) throw new Error('No %PDF- header found; this is not a PDF');
    const streams = await collect(text, data);
    if (!streams.length) throw new Error('No streams found in this PDF');
    const pick = Math.trunc(which);
    if (pick >= 1) {
      const s = streams[pick - 1];
      if (!s) throw new Error(`There is no stream ${pick} (found ${streams.length})`);
      const { bytes } = await decodeStream(s.raw, s.filters);
      return bytes;
    }
    const lines = [`${streams.length} stream(s) in this PDF:`, ''];
    for (const [i, s] of streams.entries()) {
      let size = '?'; try { const { bytes, note } = await decodeStream(s.raw, s.filters); size = `${bytes.length} bytes decoded${note ? ', ' + note : ''}`; } catch { size = `${s.raw.length} bytes (could not decode)`; }
      const preview = (() => { try { const t = decodeLatin1(s.raw.subarray(0, 0)); return t; } catch { return ''; } })();
      lines.push(`  ${String(i + 1).padStart(3)}. object ${s.obj}  filters: ${s.filters.join(', ') || 'none'}  ${size}`);
    }
    lines.push('', 'Use "Stream to extract" with a number to pull one out (follow with Detect File Type, or Render Markdown / a beautifier, depending on its content).');
    return lines.join('\n');
  }, { aliases: ['pdf', 'flatedecode', 'pdf streams', 'decompress pdf', 'pdf javascript'] });
