import { decodeLatin1, parseHex } from '../../core/util.js';

export function rawOrHex(data, fmt) { return fmt === 'Hex' ? parseHex(decodeLatin1(data)) : data; }

export function hexSep(u8, sep = '') { return [...u8].map(b => b.toString(16).padStart(2, '0')).join(sep); }

export function ipv4Str(u8, off) { return `${u8[off]}.${u8[off + 1]}.${u8[off + 2]}.${u8[off + 3]}`; }
