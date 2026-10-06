import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeAMF0, decodeAMF3 } from './_amf.js';

let amfLib = null;

module('AMF Decode', 'Action Message Format (AMF) is a binary format used to serialize object graphs such as ActionScript objects and XML, or send messages between an Adobe Flash client and a remote service, usually a Flash Media Server or third party alternatives. Output is JSON: "Wire structure" shows every element as it is encoded (type markers, lengths, reference/trait tables), "Decoded value" just the value it represents.',
  [A.select('Format', ['AMF0', 'AMF3'], 'AMF3'), A.select('View', ['Wire structure', 'Decoded value'])],
  async (data, format, view = 'Wire structure') => {
    if (view === 'Decoded value') {
      const value = format === 'AMF0' ? decodeAMF0(data) : decodeAMF3(data);
      return value === undefined ? 'undefined' : JSON.stringify(value, null, 4);
    }
    if (!amfLib) amfLib = import('./_amf_lib.mjs');
    const { AMF0, AMF3 } = await amfLib;
    const handler = format === 'AMF0' ? AMF0 : AMF3;
    return JSON.stringify(handler.Value.deserialize(new Uint8Array(data)), null, 4);
  });
