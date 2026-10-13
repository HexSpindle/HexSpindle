// Magic hints for compression operations beyond the formats core/magic.js recognises by header.
import { analyses, decodes, numericTokens } from '../../core/magic-detect.js';

// LZW as a list of decimal codes: values above 255 are dictionary references.
decodes('LZW Decode', ({ ascii, text }) => {
  if (!ascii) return null;
  const tokens = numericTokens(text);
  return tokens.length >= 8 && tokens.every(x => /^\d{1,5}$/.test(x)) && tokens.some(x => +x > 255) && +tokens[0] <= 255 && Math.max(...tokens) < 256 + tokens.length
    ? { fit: 0.7, args: [256, 'Decimal codes', 12], needsQuality: true } : null;
});
analyses('CPIO Extract', ({ at }) => at('070701') || at('070702') ? 0.9 : null);
