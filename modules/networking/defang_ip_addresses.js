import { module } from './_cat.js';

module('Defang IP Addresses', 'Makes an IP address safe to paste in a report.', [],
  (t) => t.replace(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g, m => m.replace(/\./g, '[.]')), { text: true });
