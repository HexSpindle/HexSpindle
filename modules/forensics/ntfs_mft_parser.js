// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseMft } from './_windows.js';
module("NTFS MFT Parser", "Input: Raw $MFT file or concatenated FILE records. FILE records are decoded with record-size assumption; verify record size and USA fixups from volume geometry, and expect version-specific attributes.", [], parseMft);
