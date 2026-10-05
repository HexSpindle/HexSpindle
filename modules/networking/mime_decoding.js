import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseMimeNode, walk, getHeader, getFilename, decodedBody, decodeRfc2047, decodeWithCharset, canonicalizeParamHeader } from './_mime.js';

const PARAM_HEADERS = new Set(['content-type', 'content-disposition']);

module('MIME Decoding', 'Parses a MIME/email message: headers and each body part (decoding base64/quoted-printable automatically).',
  [A.boolean('Show raw headers', true)],
  (t, headers) => {
    const root = parseMimeNode(t);
    const out = [];
    if (headers) {
      for (const [k, v] of root.headers) out.push(`${k}: ${PARAM_HEADERS.has(k.toLowerCase()) ? canonicalizeParamHeader(v) : decodeRfc2047(v)}`);
      out.push('');
    }
    if (root.isMulti) {
      let i = 0;
      for (const part of walk(root)) {
        const idx = i++;
        if (part.isMulti) continue;
        const fname = getFilename(part);
        out.push(`--- Part ${idx} (${part.type}${fname ? `, filename=${fname}` : ''}) ---`);
        try {
          const bytes = decodedBody(part);
          if (part.type.startsWith('text/')) out.push(decodeWithCharset(bytes, part.params.charset));
          else out.push(`<${bytes.length} bytes of binary content>`);
        } catch (e) {
          out.push(`<could not decode: ${e.message}>`);
        }
      }
    } else {
      const bytes = decodedBody(root);
      out.push(root.type.startsWith('text/') ? decodeWithCharset(bytes, root.params.charset) : `<${bytes.length} bytes of binary content>`);
    }
    return out.join('\n');
  }, { text: true });
