// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseFirefoxHistory } from './_browser.js';
module("Firefox History Parser", "Input: Raw Firefox places.sqlite (SQLite database). Native SQLite reader, but no WAL replay: copy database together with -wal/-shm and make a safe checkpointed working copy before import. Browser/profile versions differ; no encrypted cookie decryption.", [], parseFirefoxHistory);
