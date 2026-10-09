// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS } from './_ip_enrichment.js';
import { lookupAbusech } from './_abusech_local.js';
module('URLhaus URL Lookup',
  'Exact URL match against optional daily URLhaus recent export (past 30 days), published only with confirmed redistribution permission. One full http(s) URL per line; URL path and query are case sensitive. Domain-only input is NOT equivalent to a URL match. Absence is not evidence of benign activity. No IP list or URL is sent to abuse.ch by this operation.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  (input,output)=>lookupAbusech('urlhaus',input,output),
  {text:true,net:true,aliases:['URLhaus','abuse.ch URLhaus','Malware URL lookup']});
