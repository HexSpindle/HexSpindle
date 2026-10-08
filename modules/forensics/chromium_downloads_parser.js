// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseChromiumDownloads } from './_browser.js';
module("Chromium Downloads Parser", "Input: Raw Chromium History SQLite database, not downloaded-file bytes. Native SQLite reader, but no WAL replay: copy database together with -wal/-shm and make a safe checkpointed working copy before import. Browser/profile versions differ; no encrypted cookie decryption.", [], parseChromiumDownloads);
