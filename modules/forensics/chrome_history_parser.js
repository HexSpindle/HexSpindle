// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseChromeHistory } from './_browser.js';
module("Chrome History Parser", "Input: Raw Chromium History SQLite database. Native SQLite reader, but no WAL replay: copy database together with -wal/-shm and make a safe checkpointed working copy before import. Browser/profile versions differ; no encrypted cookie decryption.", [], parseChromeHistory);
