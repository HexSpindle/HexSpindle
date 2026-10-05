import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { canvasToPng } from './_img.js';
import { buildQrMatrix, qrMatrixToSvg } from './_qr.js';

const EC_LEVELS = { Low: 'L', Medium: 'M', Quartile: 'Q', High: 'H' };

module('Generate QR Code', 'Encodes the input text as a QR code (PNG or SVG).',
  [A.select('Image format', ['PNG', 'SVG']), A.number('Module size (px)', 5, 1, 50), A.number('Margin (modules)', 4, 0, 20),
   A.select('Error correction', ['Low', 'Medium', 'Quartile', 'High'], 'Medium')],
  async (t, fmt, moduleSize, margin, ec) => {
    const { matrix, size } = buildQrMatrix(t, EC_LEVELS[ec]);
    if (fmt === 'SVG') return qrMatrixToSvg(matrix, size, moduleSize, margin);
    const dim = (size + margin * 2) * moduleSize;
    const data = new Uint8ClampedArray(dim * dim * 4).fill(255);
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
      if (!matrix[i][j]) continue;
      const x0 = (j + margin) * moduleSize, y0 = (i + margin) * moduleSize;
      for (let y = 0; y < moduleSize; y++) for (let x = 0; x < moduleSize; x++) {
        const idx = ((y0 + y) * dim + (x0 + x)) * 4;
        data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
      }
    }
    const canvas = new OffscreenCanvas(dim, dim);
    canvas.getContext('2d').putImageData(new ImageData(data, dim, dim), 0, 0);
    return canvasToPng(canvas);
  }, { text: true });
