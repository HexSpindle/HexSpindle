// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS } from './_ip_enrichment.js';
import { lookupAbusech } from './_abusech_local.js';
module('ThreatFox IOC Lookup',
  'Search the synchronized ThreatFox IOC database locally. Supports IPv4/IPv6, domains, URLs, IP:port, and hashes. IP/domain input matches records using that exact host and domain subdomains, including URLs and IP:port indicators; complete URLs also receive exact-URL matches. Each record specifies match_type so same-host results are not mistaken for identical URLs. Defanged hxxp and [.] are accepted. Historical reports may no longer be active. No per-indicator API requests.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON'), A.boolean('Only show found indicators', true)],
  (input, output, onlyFound) => lookupAbusech('threatfox', input, output, onlyFound),
  { text:true, net:true, parallelSafe:true, parallelGroup:'ioc-enrichment', parallelProvider:'abusech_threatfox', aliases:['ThreatFox','abuse.ch ThreatFox','IOC lookup'] });
