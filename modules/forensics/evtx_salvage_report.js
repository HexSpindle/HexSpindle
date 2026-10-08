// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { convertEvtx } from './_evtx_binxml.js';
module('EVTX Salvage Report','Input: raw Windows EVTX. Explicitly reports damaged or undecodable chunks and candidate records with gaps; attempts 8-byte aligned recovery only when record framing and size trailer validate. Output is a JSON report, NOT a complete event array. Never use this report as proof of complete evidence.',[A.number('Maximum records',5000,1)],(data,max)=>convertEvtx(data,'json',max,true));
