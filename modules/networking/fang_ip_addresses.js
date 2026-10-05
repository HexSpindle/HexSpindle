import { module } from './_cat.js';

module('Fang IP Addresses', 'Reverses Defang IP Addresses: replaces [.] and [:] with . and : in IP addresses.', [],
  (t) => t.replace(/(?<=\d)\[\.\](?=\d)/g, '.').replace(/\[:\]/g, ':'), { text: true });
