import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeAMF0, decodeAMF3 } from './_amf.js';

module('AMF Decode', 'Action Message Format (AMF) is a binary format used to serialize object graphs such as ActionScript objects and XML, or send messages between an Adobe Flash client and a remote service, usually a Flash Media Server or third party alternatives. Output is JSON.',
  [A.select('Format', ['AMF0', 'AMF3'], 'AMF3')],
  (data, format) => {
    const value = format === 'AMF0' ? decodeAMF0(data) : decodeAMF3(data);
    return value === undefined ? 'undefined' : JSON.stringify(value, null, 4);
  });
