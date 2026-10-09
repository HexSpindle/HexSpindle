// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS } from './_ip_enrichment.js';
import { lookupAbusech } from './_abusech_local.js';
module('ThreatFox IOC Lookup',
  'Exact local matches against an optional abuse.ch ThreatFox export, synchronized daily only when public redistribution is authorized. Paste an IP, domain, URL, IP:port or hash per line. IP:port entries do NOT match the bare IP; the full export includes historical reports and does NOT imply current activity; absence is NOT evidence of safety. Your input never leaves this browser. Requires published authorized feed; a free Auth-Key alone is not permission to republish.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  (input,output)=>lookupAbusech('threatfox',input,output),
  {text:true,net:true,parallelSafe:true,parallelGroup:'ioc-enrichment',parallelProvider:'abusech_threatfox',aliases:['ThreatFox','abuse.ch ThreatFox','IOC lookup']});
