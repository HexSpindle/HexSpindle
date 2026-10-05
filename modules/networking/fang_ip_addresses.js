import { module } from './_cat.js';

const DOT_RE = /(?<=\d)(?:\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)|\{dot\})(?=\d)/gi;

module('Fang IP Addresses', 'Reverses Defang IP Addresses: replaces [.] (also (.), {.}, [dot]) and [:] with . and : in IP addresses.', [],
  (t) => t.replace(DOT_RE, '.').replace(/\[:\]/g, ':'), { text: true });
