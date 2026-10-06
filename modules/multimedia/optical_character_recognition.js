import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { detect } from '../../core/filetypes.js';
import { base64Encode } from '../../core/util.js';

const OEM_MODES = ['Tesseract only', 'LSTM only', 'Tesseract/LSTM Combined'];
let tesseractPromise = null;
function getTesseract() {
  if (!tesseractPromise) tesseractPromise = import('./_tesseract.mjs').then((m) => m.default.createWorker);
  return tesseractPromise;
}

module('Optical Character Recognition',
  'Extracts text from an image using the Tesseract OCR engine (English only). Requires network access the first time it runs in a browser, to fetch the OCR engine and trained-data file from a CDN (see source comments) - everything else in this app runs fully offline.',
  [A.boolean('Show confidence', true), A.select('OCR engine mode', OEM_MODES, 'LSTM only')],
  async (data, showConfidence, oemChoice) => {
    const mime = (detect(data).map(([, , m]) => m).find((m) => m.startsWith('image/'))) || null;
    if (!mime) throw new Error('Unsupported file type (supported: jpg,png,pbm,bmp) or no file provided');

    const createWorker = await getTesseract();
    const oem = OEM_MODES.findIndex(m => m.toLowerCase() === String(oemChoice).toLowerCase());
    const image = `data:${mime};base64,${base64Encode(data)}`;
    let worker;
    try {
      worker = await createWorker('eng', oem < 0 ? 1 : oem);
      const result = await worker.recognize(image);
      const text = result.data.text || '';
      if (showConfidence && typeof result.data.confidence === 'number') {
        return `Confidence: ${result.data.confidence}%\n\n${text}`;
      }
      return text;
    } catch (err) {
      throw new Error(`Error performing OCR on image. (${err})`);
    } finally {
      if (worker) await worker.terminate();
    }
  },
  { net: true }
);
