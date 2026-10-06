import { module } from './_cat.js';
import { A } from '../../core/registry.js';

/** Deserialises PHP's serialize() format straight into the output text, the way PHP
 * itself writes it: every keyed array becomes a JSON-ish object (JSON has no integer
 * keys, so with "Output valid JSON" those keys are quoted), numbers keep the digits
 * exactly as serialised, and strings keep their contents verbatim apart from the
 * quote escaping. PHP `O:` objects are an extension - they have no JSON mapping and
 * are rejected by other tools, so they are rendered as an object with __class__. */
function deserialize(s, validJson) {
  let i = 0;

  function read(n) {
    if (i + n > s.length) throw new Error('End of input reached before end of script');
    const r = s.slice(i, i + n);
    i += n;
    return r;
  }
  function readUntil(until) {
    let out = '';
    for (;;) {
      const c = read(1);
      if (c === until) return out;
      out += c;
    }
  }
  function expect(what) {
    if (read(what.length) !== what) throw new Error('Unexpected input found');
  }
  function member(key, value) {
    const num = /[0-9]+/.exec(key);
    return validJson && num && num[0].length === key.length ? `"${key}": ${value}` : `${key}: ${value}`;
  }
  function pairs(count) {
    const out = [];
    for (let n = 0; n < count; n++) {
      const key = value();
      out.push(member(key, value()));
    }
    return out.join(',');
  }
  function value() {
    const kind = read(1).toLowerCase();
    if (kind === 'n') { expect(';'); return 'null'; }
    if (kind === 'i' || kind === 'd' || kind === 'b') {
      expect(':');
      const data = readUntil(';');
      return kind === 'b' ? String(parseInt(data, 10) !== 0) : data;
    }
    if (kind === 'a') {
      expect(':');
      const count = parseInt(readUntil(':'), 10);
      expect('{');
      const body = pairs(count);
      expect('}');
      return `{${body}}`;
    }
    if (kind === 's') {
      expect(':');
      const len = parseInt(readUntil(':'), 10);
      expect('"');
      const str = read(len);
      expect('";');
      return `"${validJson ? str.replace(/"/g, '\\"') : str}"`;
    }
    if (kind === 'o') {
      expect(':');
      const nameLen = parseInt(readUntil(':'), 10);
      expect('"');
      const name = read(nameLen);
      expect('":');
      const count = parseInt(readUntil(':'), 10);
      expect('{');
      const body = pairs(count);
      expect('}');
      return `{"__class__": "${name}"${body ? ',' + body : ''}}`;
    }
    throw new Error(`Unknown type: ${kind}`);
  }

  return value();
}

module('PHP Deserialize', "Converts PHP's serialize() format to JSON.", [A.boolean('Output valid JSON', true)],
  (t, validJson) => deserialize(t.trim(), validJson), { text: true });
