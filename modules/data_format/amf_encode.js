import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { encodeAMF0, encodeAMF3 } from './_amf.js';

module('AMF Encode', 'Action Message Format (AMF) is a binary format used to serialize object graphs such as ActionScript objects and XML, or send messages between an Adobe Flash client and a remote service, usually a Flash Media Server or third party alternatives. Input is parsed as JSON.',
  [A.select('Format', ['AMF0', 'AMF3'], 'AMF3')],
  (t, format) => {
    let value;
    try { value = JSON.parse(t); } catch (e) { throw new Error(`Invalid JSON input: ${e.message}`); }
    return format === 'AMF0' ? encodeAMF0(value) : encodeAMF3(value);
  }, { text: true });
