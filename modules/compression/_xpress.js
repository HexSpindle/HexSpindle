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

export function xpressDecompressHuffman(input, decompressedSize) {
  if (decompressedSize <= 0 || decompressedSize > MAX_DECOMPRESSED) throw new Error('XPRESS: invalid decompressed size');
  if (input.length < 256) throw new Error('XPRESS: truncated Huffman table');

  const lens = new Array(512);
  for (let l = 0; l < 256; l++) {
    lens[l * 2] = input[l] & 0x0f;
    lens[l * 2 + 1] = input[l] >>> 4;
  }

  const TABLE_BITS = 15;
  const TABLE_SIZE = 1 << TABLE_BITS;
  const table = new Array(TABLE_SIZE);
  let e = 0;
  for (let l = 1; l <= TABLE_BITS; l++) {
    for (let s = 0; s < 512; s++) {
      if (lens[s] === l) {
        const n = 1 << (TABLE_BITS - l);
        for (let k = 0; k < n; k++) table[e++] = s;
      }
    }
  }
  if (e !== TABLE_SIZE) throw new Error('XPRESS: invalid Huffman code lengths');

  let bits = 0;
  let nbits = 0;
  let i = 256;
  while (nbits < 32) {
    if (input.length - i < 2) throw new Error('XPRESS: truncated bit stream');
    bits = ((bits >>> 0) | (input[i] | (input[i + 1] << 8)) << (16 - nbits)) >>> 0;
    i += 2;
    nbits += 16;
  }

  const out = [];
  for (;;) {
    while (nbits < 15) {
      if (input.length - i < 2) throw new Error('XPRESS: truncated bit stream');
      bits = ((bits >>> 0) | (input[i] | (input[i + 1] << 8)) << (16 - nbits)) >>> 0;
      i += 2;
      nbits += 16;
    }
    const sym = table[(bits >>> 17) & 0x7fff];
    const clen = lens[sym];
    bits = (bits >>> 0) << clen;
    nbits -= clen;

    if (sym < 256) {
      out.push(sym);
      if (out.length > decompressedSize) throw new Error('XPRESS: output exceeds declared size');
      continue;
    }

    if (sym === 256) {
      if (out.length === decompressedSize) break;
      if (out.length === 0 || decompressedSize - out.length < 3) throw new Error('XPRESS: corrupt end-of-data marker');
      const start = out.length - 1;
      for (let j = 0; j < 3; j++) out.push(out[start + j]);
      continue;
    }

    const hb = (sym - 256) >>> 4;
    let mlen = (sym - 256) & 15;
    if (mlen === 15) {
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
        mlen = v + 3;
      } else {
        mlen = v + 18;
      }
    } else {
      mlen += 3;
    }

    while (nbits < hb) {
      if (input.length - i < 2) throw new Error('XPRESS: truncated bit stream');
      bits = ((bits >>> 0) | (input[i] | (input[i + 1] << 8)) << (16 - nbits)) >>> 0;
      i += 2;
      nbits += 16;
    }
    let moff = 0;
    if (hb > 0) {
      moff = (bits >>> (32 - hb)) & ((1 << hb) - 1);
      bits = (bits >>> 0) << hb;
      nbits -= hb;
    }
    moff += 1 << hb;

    if (moff > out.length) throw new Error('XPRESS: match offset out of range');
    if (out.length + mlen > MAX_DECOMPRESSED) throw new Error('XPRESS: decompression ratio too large');
    if (out.length + mlen > decompressedSize) throw new Error('XPRESS: output exceeds declared size');

    const start = out.length - moff;
    for (let j = 0; j < mlen; j++) out.push(out[start + j]);
  }
  return Uint8Array.from(out);
}
