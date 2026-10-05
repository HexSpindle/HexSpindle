import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { crcHex } from './crc8_checksum.js';
import { customArgs, customCrc } from './_crc_catalogue.js';

export const CRC16 = {
  'CRC-16/ARC': [16, 0x8005n, 0x0000n, true, true, 0x0000n],
  'CRC-16/CCITT-FALSE': [16, 0x1021n, 0xFFFFn, false, false, 0x0000n],
  'CRC-16/XMODEM': [16, 0x1021n, 0x0000n, false, false, 0x0000n],
  'CRC-16/KERMIT': [16, 0x1021n, 0x0000n, true, true, 0x0000n],
  'CRC-16/MODBUS': [16, 0x8005n, 0xFFFFn, true, true, 0x0000n],
  'CRC-16/X-25': [16, 0x1021n, 0xFFFFn, true, true, 0xFFFFn],
  'CRC-16/GENIBUS': [16, 0x1021n, 0xFFFFn, false, false, 0xFFFFn],
  'CRC-16/DNP': [16, 0x3D65n, 0x0000n, true, true, 0xFFFFn],
  'CRC-16/USB': [16, 0x8005n, 0xFFFFn, true, true, 0xFFFFn],
  'CRC-16/BUYPASS': [16, 0x8005n, 0x0000n, false, false, 0x0000n],
  'CRC-16/AUG-CCITT': [16, 0x1021n, 0x1D0Fn, false, false, 0x0000n],
  'CRC-16/MCRF4XX': [16, 0x1021n, 0xFFFFn, true, true, 0x0000n],
  'CRC-16/RIELLO': [16, 0x1021n, 0xB2AAn, true, true, 0x0000n],
  'CRC-16/T10-DIF': [16, 0x8BB7n, 0x0000n, false, false, 0x0000n],
  'CRC-16/TELEDISK': [16, 0xA097n, 0x0000n, false, false, 0x0000n],
  'CRC-16/CDMA2000': [16, 0xC867n, 0xFFFFn, false, false, 0x0000n],
  'CRC-16/EN-13757': [16, 0x3D65n, 0x0000n, false, false, 0xFFFFn],
  'CRC-16/MAXIM': [16, 0x8005n, 0x0000n, true, true, 0xFFFFn],
};

module('CRC-16 Checksum', '16-bit cyclic redundancy check (many variants).',
  [A.select('Algorithm', [...Object.keys(CRC16), 'Custom']), ...customArgs()],
  (data, alg, ...custom) => (alg === 'Custom' ? customCrc(data, ...custom) : crcHex(data, CRC16[alg])));
