// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseCookieMetadata } from './_browser.js';
module("Browser Cookies Metadata Parser", "Input: Raw SQLite Cookies (Chromium) or cookies.sqlite (Firefox), base database file. Native SQLite reader, but no WAL replay: copy database together with -wal/-shm and make a safe checkpointed working copy before import. Browser/profile versions differ; no encrypted cookie decryption.", [], parseCookieMetadata);
