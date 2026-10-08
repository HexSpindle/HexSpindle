// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { buildTimeline } from './_logs.js';
module("Timeline Builder", "Input: JSON / JSONL records with timestamps. Record source and original time zone.", [], buildTimeline);
