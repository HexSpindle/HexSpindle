import { module } from './_cat.js';
import { xpressDecompress } from './_xpress.js';

module('XPRESS Decompress', "Decompresses data using Microsoft's XPRESS plain LZ77 algorithm (MS-XCA section 2.1). Similar to the Windows API RtlDecompressBuffer with COMPRESSION_FORMAT_XPRESS.", [],
  (data) => xpressDecompress(data));
