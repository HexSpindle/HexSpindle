// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS } from './_ip_enrichment.js';
import { lookupAbusech } from './_abusech_local.js';
module('URLhaus URL Lookup',
  'Search the locally synchronized URLhaus malware-URL database using IPv4/IPv6 addresses, domains, or complete URLs. IP/domain input finds URLs hosted by that IP/domain (including subdomains); full URL queries also return same-host URLs even when their paths differ. Results distinguish exact_indicator from same_host and subdomain_host. Refangs hxxp:// and [.] automatically. Matching a host is NOT proof that the queried URL path was reported. No per-indicator API requests.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON'), A.boolean('Only show found indicators', true)],
  (input, output, onlyFound) => lookupAbusech('urlhaus', input, output, onlyFound),
  { text:true, net:true, parallelSafe:true, parallelGroup:'ioc-enrichment', parallelProvider:'abusech_urlhaus', aliases:['URLhaus','abuse.ch URLhaus','Malware URL lookup'] });
