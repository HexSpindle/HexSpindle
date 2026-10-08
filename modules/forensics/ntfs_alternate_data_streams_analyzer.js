// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { analyzeNtfsAds } from './_windows.js';
module("NTFS Alternate Data Streams Analyzer", "Input: Single raw 1024-byte (or native record-size) NTFS FILE record, NOT the entire $MFT file. Reads the first FILE record in the buffer. The ADS operation reports named $DATA streams based on record attributes, not stream contents.", [], analyzeNtfsAds);
