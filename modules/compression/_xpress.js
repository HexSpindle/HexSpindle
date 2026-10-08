const MAX_DECOMPRESSED = 32 * 1024 * 1024;

export function xpressDecompress(input) {
  const out = [];
  let pending = -1; // offset of the shared-nibble byte, -1 when none pending
  let flags = 0;
  let flagsLeft = 0;
  let i = 0;

  while (true) {
    if (flagsLeft === 0) {
      if (input.length - i < 4) throw new Error('XPRESS: truncated flag group');
      flags = (input[i] | (input[i + 1] << 8) | (input[i + 2] << 16) | (input[i + 3] << 24)) >>> 0;
      i += 4;
      flagsLeft = 32;
    }
    flagsLeft--;
    if (((flags >>> flagsLeft) & 1) === 0) {
      if (i >= input.length) throw new Error('XPRESS: truncated literal');
      out.push(input[i++]);
      continue;
    }

    if (i >= input.length) return Uint8Array.from(out);
    if (input.length - i < 2) throw new Error('XPRESS: truncated match');
    const mb = input[i] | (input[i + 1] << 8);
    i += 2;
    const moff = (mb >>> 3) + 1;
    let mlen = (mb & 7) + 3;

    if ((mb & 7) === 7) {
      let nib;
      if (pending === -1) {
        if (i >= input.length) throw new Error('XPRESS: truncated shared nibble');
        nib = input[i] & 0x0f;
        pending = i++;
      } else {
        nib = input[pending] >>> 4;
        pending = -1;
      }
      if (nib === 15) {
        let v = 0;
        if (i >= input.length) throw new Error('XPRESS: truncated raw length');
        v = input[i++];
        if (v === 255) {
          if (input.length - i < 2) throw new Error('XPRESS: truncated raw length');
          v = input[i] | (input[i + 1] << 8);
          i += 2;
          if (v === 0) {
            if (input.length - i < 4) throw new Error('XPRESS: truncated raw length');
            v = (input[i] | (input[i + 1] << 8) | (input[i + 2] << 16) | (input[i + 3] << 24)) >>> 0;
            i += 4;
          }
          if (v < 22) throw new Error('XPRESS: invalid match length');
          mlen = v + 3;
        } else {
          mlen = v + 25;
        }
      } else {
        mlen = nib + 10;
      }
    }

    if (moff > 8192 || moff > out.length) throw new Error('XPRESS: match offset out of range');
    if (out.length + mlen > MAX_DECOMPRESSED) throw new Error('XPRESS: decompression ratio too large');

    const start = out.length - moff;
    for (let j = 0; j < mlen; j++) out.push(out[start + j]);
  }
}

/** MS-XCA LZ77+Huffman decoder. Bit consumption/refill is interleaved with
 * raw match-length bytes: refilling only before the next Huffman symbol is
 * INCORRECT on actual Windows-compressed MAM04 Prefetch files. Keep the shared
 * compressed byte cursor strictly in sync with the 16-bit lookahead buffer.
 * Each Huffman table describes a maximum 64-KiB decompressed block.
 */
export function xpressDecompressHuffman(input, decompressedSize) {
  if (!(input instanceof Uint8Array) || !Number.isInteger(decompressedSize) || decompressedSize <= 0 || decompressedSize > MAX_DECOMPRESSED) {
    throw new Error('XPRESS: invalid decompressed size');
  }
  const out = new Uint8Array(decompressedSize);
  let p = 0, written = 0;
  const get16 = () => { if (p + 2 > input.length) throw new Error('XPRESS: truncated 16-bit bitstream word');
    const v = input[p] | (input[p + 1] << 8); p += 2; return v; };
  const get8 = () => { if (p >= input.length) throw new Error('XPRESS: truncated match length');return input[p++]; };
  while (written < decompressedSize) {
    if (p + 256 > input.length) throw new Error('XPRESS: truncated Huffman table');
    const lens = new Uint8Array(512);
    for (let k = 0; k < 256; k++) { lens[2*k] = input[p+k] & 15; lens[2*k+1] = input[p+k] >>> 4; }
    p += 256;
    const table = new Uint16Array(32768);
    let ti = 0;
    for (let len = 1; len <= 15; len++) {
      for (let symbol = 0; symbol < 512; symbol++) if (lens[symbol] === len) {
        const entries = 1 << (15 - len);
        if (ti + entries > table.length) throw new Error('XPRESS: oversubscribed Huffman code lengths');
        table.fill(symbol, ti, ti + entries);ti += entries;
      }
    }
    if (ti !== table.length) throw new Error('XPRESS: incomplete Huffman code lengths');
    let bits = ((get16() << 16) | get16()) >>> 0;
    let extra = 16;
    const take = n => {if (!n) return 0;
      const v = bits >>> (32 - n);
      bits = (bits << n) >>> 0;extra -= n;
      if (extra < 0) {bits = (bits | (get16() << -extra)) >>> 0;extra += 16;}
      return v;
    };
    const blockEnd = Math.min(decompressedSize, written + 65536);
    while (written < blockEnd) {
      const sym = table[bits >>> 17], n = lens[sym];
      if (!n) throw new Error('XPRESS: unexpected zero-length Huffman symbol');
      take(n);
      if (sym < 256) {out[written++] = sym;continue;}
      const delta = sym - 256;
      const log2Dist = delta >>> 4;
      let matchLength = delta & 15;
      if (matchLength === 15) {
        matchLength = get8();
        if (matchLength === 255) {
          matchLength = get16();
          if (matchLength < 15) throw new Error('XPRESS: invalid long match length');
          matchLength -= 15;
        }
        matchLength += 15;
      }
      matchLength += 3;
      const matchDistance = (1 << log2Dist) + take(log2Dist);
      if (matchDistance > written || written + matchLength > blockEnd) {
        throw new Error('XPRESS: back-reference distance or length exceeds decoded block');
      }
      for (let j = 0; j < matchLength; j++) {out[written] = out[written - matchDistance];written++;}
    }
  }
  return out;
}
