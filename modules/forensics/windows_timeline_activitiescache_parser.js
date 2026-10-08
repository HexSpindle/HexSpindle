// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseWindowsTimeline } from './_browser.js';
module("Windows Timeline ActivitiesCache Parser", "Input: Raw SQLite ActivitiesCache.db (base DB only). WAL replay is NOT implemented in the HexSpindle browser SQLite reader; input base DB alone can omit recent records.", [], parseWindowsTimeline);
