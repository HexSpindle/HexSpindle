// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parsePrefetch } from './_windows.js';
module("Windows Prefetch Parser", "Input: Raw Windows .pf file (uncompressed SCCA or compressed MAM04 XPRESS-Huffman). MAM04 decoding is now attempted with strict SCCA/length validation but has not yet been independently validated on a real compressed Windows Prefetch corpus.", [], parsePrefetch);
