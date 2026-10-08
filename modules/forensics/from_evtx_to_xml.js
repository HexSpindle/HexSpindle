// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { convertEvtx } from './_evtx_binxml.js';
module('EVTX to XML','Convert a RAW Windows .evtx file into Event XML using BinXML templates and substitutions. Use this BEFORE the existing Windows event analyzers. Output is a well-formed <Events> XML document containing <Event> records; not a Windows Event Log file.',[A.number('Maximum events',1000,1)],(data,limit)=>convertEvtx(data,'xml',limit));
