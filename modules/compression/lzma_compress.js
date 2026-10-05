import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { lzmaAloneCompress } from './_lzma.js';

module('LZMA Compress', 'Compresses with raw LZMA ("alone"/.lzma format). The modern .xz container (LZMA2) is not supported in this browser-side port - only "Raw LZMA (alone)" is available.',
  [A.select('Format', ['XZ', 'Raw LZMA (alone)'])],
  (data, fmt) => {
    if (fmt === 'XZ') throw new Error("The .xz container (LZMA2) isn't supported in this browser-side port; use 'Raw LZMA (alone)'");
    return lzmaAloneCompress(data);
  });
