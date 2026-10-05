import { module } from './_cat.js';
import { lzmaAloneDecompress } from './_lzma.js';

module('LZMA Decompress', 'Decompresses raw LZMA ("alone"/.lzma) data. The modern .xz container (LZMA2) is not supported in this browser-side port.',
  [], (data) => {
    if (data.length >= 6 && data[0] === 0xFD && data[1] === 0x37 && data[2] === 0x7A && data[3] === 0x58 && data[4] === 0x5A && data[5] === 0x00) {
      throw new Error("This is an .xz container (LZMA2): not supported in this browser-side port, only the legacy raw LZMA 'alone' format is. Re-compress with the 'Raw LZMA (alone)' option if you control the source.");
    }
    return lzmaAloneDecompress(data);
  });
