import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { encodePng } from './_png.js';
import { qrMatrix, qrVector } from './_qrimage.js';

const EC_LEVELS = { Low: 'L', Medium: 'M', Quartile: 'Q', High: 'H' };

module('Generate QR Code', 'Encodes the input text as a QR code (PNG, SVG, EPS or PDF).',
  [A.select('Image format', ['PNG', 'SVG', 'EPS', 'PDF']), A.number('Module size (px)', 5, 1, 50), A.number('Margin (modules)', 4, 0, 20),
   A.select('Error correction', ['Low', 'Medium', 'Quartile', 'High'], 'Medium')],
  async (t, fmt, moduleSize, margin, ec) => {
    let matrix;
    try { matrix = qrMatrix(t, EC_LEVELS[ec] || 'M'); } catch (e) { throw new Error(`Error generating QR code. (${e.message || e})`); }
    if (['SVG', 'EPS', 'PDF'].includes(fmt)) return qrVector(fmt.toLowerCase(), matrix, margin, moduleSize);
    const size = matrix.length, dim = (size + margin * 2) * moduleSize;
    const px = new Uint8Array(dim * dim * 4).fill(255);
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
      if (!matrix[i][j]) continue;
      for (let y = 0; y < moduleSize; y++) for (let x = 0; x < moduleSize; x++) {
        const idx = (((i + margin) * moduleSize + y) * dim + (j + margin) * moduleSize + x) * 4;
        px[idx] = px[idx + 1] = px[idx + 2] = 0;
      }
    }
    return encodePng(px, dim, dim);
  }, { text: true });
