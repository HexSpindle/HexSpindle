import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHello } from './_tls.js';
import { rawOrHex } from './_packet.js';

const EXT_NAMES = { 0: 'server_name', 5: 'status_request', 10: 'supported_groups', 11: 'ec_point_formats', 13: 'signature_algorithms',
  16: 'application_layer_protocol_negotiation', 23: 'extended_master_secret', 35: 'session_ticket', 43: 'supported_versions',
  45: 'psk_key_exchange_modes', 51: 'key_share', 65281: 'renegotiation_info' };

module('Parse TLS record', 'Decodes a TLS handshake record (ClientHello or ServerHello): version, cipher suite(s), extensions, curves.', [A.select('Input format', ['Raw', 'Hex'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    const info = parseHello(b);
    const out = [`Type: ${info.type}`, `Version: 0x${info.version.toString(16).padStart(4, '0')}`];
    if ('ciphers' in info) out.push(`Cipher suites (${info.ciphers.length}): ` + info.ciphers.map(c => `0x${c.toString(16).padStart(4, '0')}`).join(', '));
    else out.push(`Selected cipher: 0x${info.cipher.toString(16).padStart(4, '0')}`);
    out.push('Extensions: ' + info.extensions.map(e => `${e} (${EXT_NAMES[e] || 'unknown'})`).join(', '));
    if (info.curves.length) out.push('Supported groups/curves: ' + info.curves.map(c => `0x${c.toString(16).padStart(4, '0')}`).join(', '));
    if (info.point_formats.length) out.push('EC point formats: ' + info.point_formats.join(', '));
    return out.join('\n');
  });
