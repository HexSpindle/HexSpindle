// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { explainWindowsEventId } from './_logs.js';
module("Windows Event ID Explainer", "Input: Text containing Windows event IDs. Maps known IDs; not full event parser.", [], explainWindowsEventId);
