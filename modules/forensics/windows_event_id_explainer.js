// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { explainWindowsEventId } from './_event_id_explainer.js';
module("Windows Event ID Explainer", "Explain Windows Security audit and Sysmon event IDs from numeric lists, decoded XML, or event JSON; distinguishes providers and audit categories.", [], explainWindowsEventId);
