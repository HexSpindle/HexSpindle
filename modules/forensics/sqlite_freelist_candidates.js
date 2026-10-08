// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { sqliteDeletedCandidates } from './_sqlite_recovery.js';
module('SQLite Freelist Record Candidates','Input: native SQLite database (for WAL-mode, first apply SQLite WAL Snapshot ZIP). Reports structurally intact table-leaf cell candidates on freelist pages with offsets and explicit UNVERIFIED labels. Does not fabricate freeblock headers, claim rows were deleted, or assign table names without corroboration.',[],data=>JSON.stringify(sqliteDeletedCandidates(data)));
