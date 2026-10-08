// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseAuditd } from './_logs.js';
module("Linux Auditd Parser", "Input: Plain-text Linux auditd record lines (not a binary data file). Analyzes text audit records; not a Linux filesystem journal or binary audit file.", [], parseAuditd);
