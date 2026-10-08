// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { convertEvtx } from './_evtx_binxml.js';
module('EVTX to JSON','Convert a RAW Windows .evtx file to an analyzer-compatible JSON array of EventID, ProviderName, TimeCreated, System and EventData fields. Use before Sysmon / Logon / Kerberos / Defender / RDP analyzers.',[A.number('Maximum events',1000,1)],(data,limit)=>convertEvtx(data,'json',limit));
