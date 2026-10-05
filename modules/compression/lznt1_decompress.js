import { module } from './_cat.js';

const COMPRESSED_MASK = 1 << 15;
const SIZE_MASK = (1 << 12) - 1;

function getDisplacement(offset) {
  let result = 0;
  while (offset >= 0x10) { offset >>= 1; result += 1; }
  return result;
}

module('LZNT1 Decompress', "Decompresses data using Microsoft's LZNT1 algorithm (NTFS compressed files, registry hives). Similar to the Windows API RtlDecompressBuffer.", [],
  (compressed) => {
    const decompressed = [];
    let coffset = 0;

    while (coffset + 2 <= compressed.length) {
      const doffset = decompressed.length;

      const blockHeader = compressed[coffset] | (compressed[coffset + 1] << 8);
      coffset += 2;

      const size = blockHeader & SIZE_MASK;
      const blockEnd = coffset + size + 1;

      if (size === 0) {
        break;
      } else if (compressed.length < coffset + size) {
        throw new Error('Malformed LZNT1 stream: Block too small! Has the stream been truncated?');
      }

      if ((blockHeader & COMPRESSED_MASK) !== 0) {
        while (coffset < blockEnd) {
          let header = compressed[coffset++];

          for (let i = 0; i < 8 && coffset < blockEnd; i++) {
            if ((header & 1) === 0) {
              decompressed.push(compressed[coffset++]);
            } else {
              const pointer = compressed[coffset] | (compressed[coffset + 1] << 8);
              coffset += 2;

              const displacement = getDisplacement(decompressed.length - doffset - 1);
              const symbolOffset = (pointer >> (12 - displacement)) + 1;
              const symbolLength = (pointer & (0xFFF >> displacement)) + 2;
              const shiftOffset = decompressed.length - symbolOffset;

              for (let shiftDelta = 0; shiftDelta < symbolLength + 1; shiftDelta++) {
                const shift = shiftOffset + shiftDelta;
                if (shift < 0 || decompressed.length <= shift) {
                  throw new Error('Malformed LZNT1 stream: Invalid shift!');
                }
                decompressed.push(decompressed[shift]);
              }
            }
            header >>= 1;
          }
        }
      } else {
        for (let k = coffset; k < coffset + size + 1; k++) decompressed.push(compressed[k]);
        coffset += size + 1;
      }
    }

    return Uint8Array.from(decompressed);
  });
