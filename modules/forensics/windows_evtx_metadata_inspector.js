// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { parseEvtx } from './_windows.js';
module("Windows EVTX Metadata Inspector", "Input: Raw Windows .evtx binary (ElfFile signature). Native header, chunk framing, record IDs and record timestamps ONLY. EventID, Provider, EventData and BinXML XML are NOT decoded; use a full parser for event-level analysis.", [], parseEvtx);
