import { A } from '../../core/registry.js';

function reflectData(data, reflect) {
  let value = 0n;
  for (let bit = 0n; bit < reflect; bit++) {
    if ((data & 1n) === 1n) value |= 1n << (reflect - 1n - bit);
    data >>= 1n;
  }
  return value;
}

function crcBitPerBit(width, input, poly, remainder, reflectIn, reflectOut, xorOut) {
  const TOP_BIT = 1n << (width - 1n);
  const MASK = (1n << width) - 1n;
  for (let byte of input) {
    byte = BigInt(byte);
    if (reflectIn) byte = reflectData(byte, 8n);
    for (let i = 0x80n; i !== 0n; i >>= 1n) {
      let bit = remainder & TOP_BIT;
      remainder = (remainder << 1n) & MASK;
      if ((byte & i) !== 0n) bit ^= TOP_BIT;
      if (bit !== 0n) remainder ^= poly;
    }
  }
  if (reflectOut) remainder = reflectData(remainder, width);
  return remainder ^ xorOut;
}

const tableCache = new Map();
function crcBytePerByte(width, input, poly, remainder, reflectIn, reflectOut, xorOut) {
  const TOP_BIT = 1n << (width - 1n);
  const MASK = (1n << width) - 1n;
  const key = `${width},${poly}`;
  let table = tableCache.get(key);
  if (!table) {
    table = new Array(256);
    for (let byte = 0n; byte < 256n; byte++) {
      let value = (byte << (width - 8n)) & MASK;
      for (let bit = 0n; bit < 8n; bit++) value = (value & TOP_BIT) === 0n ? (value << 1n) & MASK : ((value << 1n) & MASK) ^ poly;
      table[byte] = value;
    }
    tableCache.set(key, table);
  }
  for (let byte of input) {
    byte = BigInt(byte);
    if (reflectIn) byte = reflectData(byte, 8n);
    remainder ^= (byte << (width - 8n)) & MASK;
    const index = remainder >> (width - 8n);
    remainder = (remainder << 8n) & MASK;
    remainder ^= table[index];
  }
  if (reflectOut) remainder = reflectData(remainder, width);
  return remainder ^ xorOut;
}

export function ccCrc(width, input, poly, init, reflectIn, reflectOut, xorOut) {
  const v = width < 8n
    ? crcBitPerBit(width, input, poly, init, reflectIn, reflectOut, xorOut)
    : crcBytePerByte(width, input, poly, init, reflectIn, reflectOut, xorOut);
  return v.toString(16).padStart(Math.ceil(Number(width) / 4), '0');
}

export const customArgs = () => [
  A.toggle('Width (bits)', '0', ['Decimal'], 'Decimal'),
  A.toggle('Polynomial', '0', ['Hex'], 'Hex'),
  A.toggle('Initialization', '0', ['Hex'], 'Hex'),
  A.select('Reflect input', ['True', 'False']),
  A.select('Reflect output', ['True', 'False']),
  A.toggle('Xor Output', '0', ['Hex'], 'Hex'),
];

const bytesToBigInt = (u8) => { let v = 0n; for (const b of u8) v = (v << 8n) | BigInt(b); return v; };

export function customCrc(data, width, poly, init, refIn, refOut, xorOut) {
  if (width.length > 1) throw new Error('Invalid custom CRC arguments');
  try {
    return ccCrc(width.length ? BigInt(width[0]) : 0n, data, bytesToBigInt(poly), bytesToBigInt(init), refIn === 'True', refOut === 'True', bytesToBigInt(xorOut));
  } catch {
    throw new Error('Invalid custom CRC arguments');
  }
}

export const CRC_CATALOGUE = {
  'CRC-3/GSM': [3, 0x3n, 0x0n, false, false, 0x7n],
  'CRC-3/ROHC': [3, 0x3n, 0x7n, true, true, 0x0n],
  'CRC-4/G-704': [4, 0x3n, 0x0n, true, true, 0x0n],
  'CRC-4/INTERLAKEN': [4, 0x3n, 0xFn, false, false, 0xFn],
  'CRC-4/ITU': [4, 0x3n, 0x0n, true, true, 0x0n],
  'CRC-5/EPC': [5, 0x09n, 0x09n, false, false, 0x00n],
  'CRC-5/EPC-C1G2': [5, 0x09n, 0x09n, false, false, 0x00n],
  'CRC-5/G-704': [5, 0x15n, 0x00n, true, true, 0x00n],
  'CRC-5/ITU': [5, 0x15n, 0x00n, true, true, 0x00n],
  'CRC-5/USB': [5, 0x05n, 0x1Fn, true, true, 0x1Fn],
  'CRC-6/CDMA2000-A': [6, 0x27n, 0x3Fn, false, false, 0x00n],
  'CRC-6/CDMA2000-B': [6, 0x07n, 0x3Fn, false, false, 0x00n],
  'CRC-6/DARC': [6, 0x19n, 0x00n, true, true, 0x00n],
  'CRC-6/G-704': [6, 0x03n, 0x00n, true, true, 0x00n],
  'CRC-6/GSM': [6, 0x2Fn, 0x00n, false, false, 0x3Fn],
  'CRC-6/ITU': [6, 0x03n, 0x00n, true, true, 0x00n],
  'CRC-7/MMC': [7, 0x09n, 0x00n, false, false, 0x00n],
  'CRC-7/ROHC': [7, 0x4Fn, 0x7Fn, true, true, 0x00n],
  'CRC-7/UMTS': [7, 0x45n, 0x00n, false, false, 0x00n],
  'CRC-8': [8, 0x07n, 0x00n, false, false, 0x00n],
  'CRC-8/8H2F': [8, 0x2Fn, 0xFFn, false, false, 0xFFn],
  'CRC-8/AES': [8, 0x1Dn, 0xFFn, true, true, 0x00n],
  'CRC-8/AUTOSAR': [8, 0x2Fn, 0xFFn, false, false, 0xFFn],
  'CRC-8/BLUETOOTH': [8, 0xA7n, 0x00n, true, true, 0x00n],
  'CRC-8/CDMA2000': [8, 0x9Bn, 0xFFn, false, false, 0x00n],
  'CRC-8/DARC': [8, 0x39n, 0x00n, true, true, 0x00n],
  'CRC-8/DVB-S2': [8, 0xD5n, 0x00n, false, false, 0x00n],
  'CRC-8/EBU': [8, 0x1Dn, 0xFFn, true, true, 0x00n],
  'CRC-8/GSM-A': [8, 0x1Dn, 0x00n, false, false, 0x00n],
  'CRC-8/GSM-B': [8, 0x49n, 0x00n, false, false, 0xFFn],
  'CRC-8/HITAG': [8, 0x1Dn, 0xFFn, false, false, 0x00n],
  'CRC-8/I-432-1': [8, 0x07n, 0x00n, false, false, 0x55n],
  'CRC-8/I-CODE': [8, 0x1Dn, 0xFDn, false, false, 0x00n],
  'CRC-8/ITU': [8, 0x07n, 0x00n, false, false, 0x55n],
  'CRC-8/LTE': [8, 0x9Bn, 0x00n, false, false, 0x00n],
  'CRC-8/MAXIM': [8, 0x31n, 0x00n, true, true, 0x00n],
  'CRC-8/MAXIM-DOW': [8, 0x31n, 0x00n, true, true, 0x00n],
  'CRC-8/MIFARE-MAD': [8, 0x1Dn, 0xC7n, false, false, 0x00n],
  'CRC-8/NRSC-5': [8, 0x31n, 0xFFn, false, false, 0x00n],
  'CRC-8/OPENSAFETY': [8, 0x2Fn, 0x00n, false, false, 0x00n],
  'CRC-8/ROHC': [8, 0x07n, 0xFFn, true, true, 0x00n],
  'CRC-8/SAE-J1850': [8, 0x1Dn, 0xFFn, false, false, 0xFFn],
  'CRC-8/SAE-J1850-ZERO': [8, 0x1Dn, 0x00n, false, false, 0x00n],
  'CRC-8/SMBUS': [8, 0x07n, 0x00n, false, false, 0x00n],
  'CRC-8/TECH-3250': [8, 0x1Dn, 0xFFn, true, true, 0x00n],
  'CRC-8/WCDMA': [8, 0x9Bn, 0x00n, true, true, 0x00n],
  'CRC-10/ATM': [10, 0x233n, 0x000n, false, false, 0x000n],
  'CRC-10/CDMA2000': [10, 0x3D9n, 0x3FFn, false, false, 0x000n],
  'CRC-10/GSM': [10, 0x175n, 0x000n, false, false, 0x3FFn],
  'CRC-10/I-610': [10, 0x233n, 0x000n, false, false, 0x000n],
  'CRC-11/FLEXRAY': [11, 0x385n, 0x01An, false, false, 0x000n],
  'CRC-11/UMTS': [11, 0x307n, 0x000n, false, false, 0x000n],
  'CRC-12/3GPP': [12, 0x80Fn, 0x000n, false, true, 0x000n],
  'CRC-12/CDMA2000': [12, 0xF13n, 0xFFFn, false, false, 0x000n],
  'CRC-12/DECT': [12, 0x80Fn, 0x000n, false, false, 0x000n],
  'CRC-12/GSM': [12, 0xD31n, 0x000n, false, false, 0xFFFn],
  'CRC-12/UMTS': [12, 0x80Fn, 0x000n, false, true, 0x000n],
  'CRC-13/BBC': [13, 0x1CF5n, 0x0000n, false, false, 0x0000n],
  'CRC-14/DARC': [14, 0x0805n, 0x0000n, true, true, 0x0000n],
  'CRC-14/GSM': [14, 0x202Dn, 0x0000n, false, false, 0x3FFFn],
  'CRC-15/CAN': [15, 0x4599n, 0x0000n, false, false, 0x0000n],
  'CRC-15/MPT1327': [15, 0x6815n, 0x0000n, false, false, 0x0001n],
  'CRC-16': [16, 0x8005n, 0x0000n, true, true, 0x0000n],
  'CRC-16/A': [16, 0x1021n, 0xC6C6n, true, true, 0x0000n],
  'CRC-16/ACORN': [16, 0x1021n, 0x0000n, false, false, 0x0000n],
  'CRC-16/ARC': [16, 0x8005n, 0x0000n, true, true, 0x0000n],
  'CRC-16/AUG-CCITT': [16, 0x1021n, 0x1D0Fn, false, false, 0x0000n],
  'CRC-16/AUTOSAR': [16, 0x1021n, 0xFFFFn, false, false, 0x0000n],
  'CRC-16/B': [16, 0x1021n, 0xFFFFn, true, true, 0xFFFFn],
  'CRC-16/BLUETOOTH': [16, 0x1021n, 0x0000n, true, true, 0x0000n],
  'CRC-16/BUYPASS': [16, 0x8005n, 0x0000n, false, false, 0x0000n],
  'CRC-16/CCITT': [16, 0x1021n, 0x0000n, true, true, 0x0000n],
  'CRC-16/CCITT-FALSE': [16, 0x1021n, 0xFFFFn, false, false, 0x0000n],
  'CRC-16/CCITT-TRUE': [16, 0x1021n, 0x0000n, true, true, 0x0000n],
  'CRC-16/CCITT-ZERO': [16, 0x1021n, 0x0000n, false, false, 0x0000n],
  'CRC-16/CDMA2000': [16, 0xC867n, 0xFFFFn, false, false, 0x0000n],
  'CRC-16/CMS': [16, 0x8005n, 0xFFFFn, false, false, 0x0000n],
  'CRC-16/DARC': [16, 0x1021n, 0xFFFFn, false, false, 0xFFFFn],
  'CRC-16/DDS-110': [16, 0x8005n, 0x800Dn, false, false, 0x0000n],
  'CRC-16/DECT-R': [16, 0x0589n, 0x0000n, false, false, 0x0001n],
  'CRC-16/DECT-X': [16, 0x0589n, 0x0000n, false, false, 0x0000n],
  'CRC-16/DNP': [16, 0x3D65n, 0x0000n, true, true, 0xFFFFn],
  'CRC-16/EN-13757': [16, 0x3D65n, 0x0000n, false, false, 0xFFFFn],
  'CRC-16/EPC': [16, 0x1021n, 0xFFFFn, false, false, 0xFFFFn],
  'CRC-16/EPC-C1G2': [16, 0x1021n, 0xFFFFn, false, false, 0xFFFFn],
  'CRC-16/GENIBUS': [16, 0x1021n, 0xFFFFn, false, false, 0xFFFFn],
  'CRC-16/GSM': [16, 0x1021n, 0x0000n, false, false, 0xFFFFn],
  'CRC-16/I-CODE': [16, 0x1021n, 0xFFFFn, false, false, 0xFFFFn],
  'CRC-16/IBM': [16, 0x8005n, 0x0000n, true, true, 0x0000n],
  'CRC-16/IBM-3740': [16, 0x1021n, 0xFFFFn, false, false, 0x0000n],
  'CRC-16/IBM-SDLC': [16, 0x1021n, 0xFFFFn, true, true, 0xFFFFn],
  'CRC-16/IEC-61158-2': [16, 0x1DCFn, 0xFFFFn, false, false, 0xFFFFn],
  'CRC-16/ISO-HDLC': [16, 0x1021n, 0xFFFFn, true, true, 0xFFFFn],
  'CRC-16/ISO-IEC-14443-3-A': [16, 0x1021n, 0xC6C6n, true, true, 0x0000n],
  'CRC-16/ISO-IEC-14443-3-B': [16, 0x1021n, 0xFFFFn, true, true, 0xFFFFn],
  'CRC-16/KERMIT': [16, 0x1021n, 0x0000n, true, true, 0x0000n],
  'CRC-16/LHA': [16, 0x8005n, 0x0000n, true, true, 0x0000n],
  'CRC-16/LJ1200': [16, 0x6F63n, 0x0000n, false, false, 0x0000n],
  'CRC-16/LTE': [16, 0x1021n, 0x0000n, false, false, 0x0000n],
  'CRC-16/M17': [16, 0x5935n, 0xFFFFn, false, false, 0x0000n],
  'CRC-16/MAXIM': [16, 0x8005n, 0x0000n, true, true, 0xFFFFn],
  'CRC-16/MAXIM-DOW': [16, 0x8005n, 0x0000n, true, true, 0xFFFFn],
  'CRC-16/MCRF4XX': [16, 0x1021n, 0xFFFFn, true, true, 0x0000n],
  'CRC-16/MODBUS': [16, 0x8005n, 0xFFFFn, true, true, 0x0000n],
  'CRC-16/NRSC-5': [16, 0x080Bn, 0xFFFFn, true, true, 0x0000n],
  'CRC-16/OPENSAFETY-A': [16, 0x5935n, 0x0000n, false, false, 0x0000n],
  'CRC-16/OPENSAFETY-B': [16, 0x755Bn, 0x0000n, false, false, 0x0000n],
  'CRC-16/PROFIBUS': [16, 0x1DCFn, 0xFFFFn, false, false, 0xFFFFn],
  'CRC-16/RIELLO': [16, 0x1021n, 0xB2AAn, true, true, 0x0000n],
  'CRC-16/SPI-FUJITSU': [16, 0x1021n, 0x1D0Fn, false, false, 0x0000n],
  'CRC-16/T10-DIF': [16, 0x8BB7n, 0x0000n, false, false, 0x0000n],
  'CRC-16/TELEDISK': [16, 0xA097n, 0x0000n, false, false, 0x0000n],
  'CRC-16/TMS37157': [16, 0x1021n, 0x89ECn, true, true, 0x0000n],
  'CRC-16/UMTS': [16, 0x8005n, 0x0000n, false, false, 0x0000n],
  'CRC-16/USB': [16, 0x8005n, 0xFFFFn, true, true, 0xFFFFn],
  'CRC-16/V-41-LSB': [16, 0x1021n, 0x0000n, true, true, 0x0000n],
  'CRC-16/V-41-MSB': [16, 0x1021n, 0x0000n, false, false, 0x0000n],
  'CRC-16/VERIFONE': [16, 0x8005n, 0x0000n, false, false, 0x0000n],
  'CRC-16/X-25': [16, 0x1021n, 0xFFFFn, true, true, 0xFFFFn],
  'CRC-16/XMODEM': [16, 0x1021n, 0x0000n, false, false, 0x0000n],
  'CRC-16/ZMODEM': [16, 0x1021n, 0x0000n, false, false, 0x0000n],
  'CRC-17/CAN-FD': [17, 0x1685Bn, 0x00000n, false, false, 0x00000n],
  'CRC-21/CAN-FD': [21, 0x102899n, 0x000000n, false, false, 0x000000n],
  'CRC-24/BLE': [24, 0x00065Bn, 0x555555n, true, true, 0x000000n],
  'CRC-24/FLEXRAY-A': [24, 0x5D6DCBn, 0xFEDCBAn, false, false, 0x000000n],
  'CRC-24/FLEXRAY-B': [24, 0x5D6DCBn, 0xABCDEFn, false, false, 0x000000n],
  'CRC-24/INTERLAKEN': [24, 0x328B63n, 0xFFFFFFn, false, false, 0xFFFFFFn],
  'CRC-24/LTE-A': [24, 0x864CFBn, 0x000000n, false, false, 0x000000n],
  'CRC-24/LTE-B': [24, 0x800063n, 0x000000n, false, false, 0x000000n],
  'CRC-24/OPENPGP': [24, 0x864CFBn, 0xB704CEn, false, false, 0x000000n],
  'CRC-24/OS-9': [24, 0x800063n, 0xFFFFFFn, false, false, 0xFFFFFFn],
  'CRC-30/CDMA': [30, 0x2030B9C7n, 0x3FFFFFFFn, false, false, 0x3FFFFFFFn],
  'CRC-31/PHILIPS': [31, 0x04C11DB7n, 0x7FFFFFFFn, false, false, 0x7FFFFFFFn],
  'CRC-32': [32, 0x04C11DB7n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/AAL5': [32, 0x04C11DB7n, 0xFFFFFFFFn, false, false, 0xFFFFFFFFn],
  'CRC-32/ADCCP': [32, 0x04C11DB7n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/AIXM': [32, 0x814141ABn, 0x00000000n, false, false, 0x00000000n],
  'CRC-32/AUTOSAR': [32, 0xF4ACFB13n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/BASE91-C': [32, 0x1EDC6F41n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/BASE91-D': [32, 0xA833982Bn, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/BZIP2': [32, 0x04C11DB7n, 0xFFFFFFFFn, false, false, 0xFFFFFFFFn],
  'CRC-32/C': [32, 0x1EDC6F41n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/CASTAGNOLI': [32, 0x1EDC6F41n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/CD-ROM-EDC': [32, 0x8001801Bn, 0x00000000n, true, true, 0x00000000n],
  'CRC-32/CKSUM': [32, 0x04C11DB7n, 0x00000000n, false, false, 0xFFFFFFFFn],
  'CRC-32/D': [32, 0xA833982Bn, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/DECT-B': [32, 0x04C11DB7n, 0xFFFFFFFFn, false, false, 0xFFFFFFFFn],
  'CRC-32/INTERLAKEN': [32, 0x1EDC6F41n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/ISCSI': [32, 0x1EDC6F41n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/ISO-HDLC': [32, 0x04C11DB7n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/JAMCRC': [32, 0x04C11DB7n, 0xFFFFFFFFn, true, true, 0x00000000n],
  'CRC-32/MEF': [32, 0x741B8CD7n, 0xFFFFFFFFn, true, true, 0x00000000n],
  'CRC-32/MPEG-2': [32, 0x04C11DB7n, 0xFFFFFFFFn, false, false, 0x00000000n],
  'CRC-32/NVME': [32, 0x1EDC6F41n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/PKZIP': [32, 0x04C11DB7n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/POSIX': [32, 0x04C11DB7n, 0x00000000n, false, false, 0xFFFFFFFFn],
  'CRC-32/Q': [32, 0x814141ABn, 0x00000000n, false, false, 0x00000000n],
  'CRC-32/SATA': [32, 0x04C11DB7n, 0x52325032n, false, false, 0x00000000n],
  'CRC-32/V-42': [32, 0x04C11DB7n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-32/XFER': [32, 0x000000AFn, 0x00000000n, false, false, 0x00000000n],
  'CRC-32/XZ': [32, 0x04C11DB7n, 0xFFFFFFFFn, true, true, 0xFFFFFFFFn],
  'CRC-40/GSM': [40, 0x0004820009n, 0x0000000000n, false, false, 0xFFFFFFFFFFn],
  'CRC-64/ECMA-182': [64, 0x42F0E1EBA9EA3693n, 0x0000000000000000n, false, false, 0x0000000000000000n],
  'CRC-64/GO-ECMA': [64, 0x42F0E1EBA9EA3693n, 0xFFFFFFFFFFFFFFFFn, true, true, 0xFFFFFFFFFFFFFFFFn],
  'CRC-64/GO-ISO': [64, 0x000000000000001Bn, 0xFFFFFFFFFFFFFFFFn, true, true, 0xFFFFFFFFFFFFFFFFn],
  'CRC-64/MS': [64, 0x259C84CBA6426349n, 0xFFFFFFFFFFFFFFFFn, true, true, 0x0000000000000000n],
  'CRC-64/NVME': [64, 0xAD93D23594C93659n, 0xFFFFFFFFFFFFFFFFn, true, true, 0xFFFFFFFFFFFFFFFFn],
  'CRC-64/REDIS': [64, 0xAD93D23594C935A9n, 0x0000000000000000n, true, true, 0x0000000000000000n],
  'CRC-64/WE': [64, 0x42F0E1EBA9EA3693n, 0xFFFFFFFFFFFFFFFFn, false, false, 0xFFFFFFFFFFFFFFFFn],
  'CRC-64/XZ': [64, 0x42F0E1EBA9EA3693n, 0xFFFFFFFFFFFFFFFFn, true, true, 0xFFFFFFFFFFFFFFFFn],
  'CRC-82/DARC': [82, 0x0308C0111011401440411n, 0x000000000000000000000n, true, true, 0x000000000000000000000n],
};
