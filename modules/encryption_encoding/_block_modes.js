export function pkcs7Pad(data, bs) {
  const padLen = bs - (data.length % bs);
  const out = new Uint8Array(data.length + padLen);
  out.set(data);
  out.fill(padLen, data.length);
  return out;
}

export function pkcs7Unpad(data, bs) {
  if (data.length === 0 || data.length % bs !== 0) throw new Error('Data is not padded correctly');
  const padLen = data[data.length - 1];
  if (padLen < 1 || padLen > bs) throw new Error('Padding is incorrect.');
  for (let i = data.length - padLen; i < data.length; i++) {
    if (data[i] !== padLen) throw new Error('Padding is incorrect.');
  }
  return data.slice(0, data.length - padLen);
}

function xorBlock(out, a, b, len) {
  for (let i = 0; i < len; i++) out[i] = a[i] ^ b[i];
}

function incCounter(block, from, len) {
  for (let i = from + len - 1; i >= from; i--) {
    block[i] = (block[i] + 1) & 0xff;
    if (block[i] !== 0) break;
  }
}

export function blockCipherCrypt(cipher, { data, key, iv, mode, decrypt, strictCtr = true }) {
  const bs = cipher.blockSize;
  const ks = cipher.keySchedule(key);

  if (mode !== 'ECB' && mode !== 'CTR' && iv.length !== bs) {
    throw new Error(`IV must be ${bs} bytes for ${mode} (got ${iv.length})`);
  }

  if (mode === 'ECB' || mode === 'CBC') {
    let input;
    if (!decrypt) {
      input = pkcs7Pad(data, bs);
    } else {
      if (data.length === 0 || data.length % bs !== 0) throw new Error(`Data must be a multiple of ${bs} bytes long`);
      input = data;
    }
    const out = new Uint8Array(input.length);
    if (mode === 'ECB') {
      for (let i = 0; i < input.length; i += bs) {
        const block = input.subarray(i, i + bs);
        out.set(decrypt ? cipher.decryptBlock(ks, block) : cipher.encryptBlock(ks, block), i);
      }
    } else if (!decrypt) {
      let prev = iv;
      for (let i = 0; i < input.length; i += bs) {
        const xored = new Uint8Array(bs);
        xorBlock(xored, input.subarray(i, i + bs), prev, bs);
        const enc = cipher.encryptBlock(ks, xored);
        out.set(enc, i);
        prev = enc;
      }
    } else {
      let prev = iv;
      for (let i = 0; i < input.length; i += bs) {
        const block = input.subarray(i, i + bs);
        const dec = cipher.decryptBlock(ks, block);
        const plain = new Uint8Array(bs);
        xorBlock(plain, dec, prev, bs);
        out.set(plain, i);
        prev = block;
      }
    }
    return decrypt ? pkcs7Unpad(out, bs) : out;
  }

  if (mode === 'CFB' || mode === 'OFB') {
    let prev = iv;
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += bs) {
      const chunkLen = Math.min(bs, data.length - i);
      const keystream = cipher.encryptBlock(ks, prev);
      const chunk = data.subarray(i, i + chunkLen);
      const outChunk = new Uint8Array(chunkLen);
      for (let j = 0; j < chunkLen; j++) outChunk[j] = chunk[j] ^ keystream[j];
      out.set(outChunk, i);
      prev = mode === 'OFB' ? keystream : (decrypt ? chunk : outChunk);
    }
    return out;
  }

  if (mode === 'CTR') {
    let counter, nonceLen;
    if (iv.length === bs) {
      counter = iv.slice();
      nonceLen = 0;
    } else if (!strictCtr && iv.length < bs) {
      counter = new Uint8Array(bs);
      counter.set(iv);
      nonceLen = iv.length;
    } else {
      throw new Error(`IV must be ${bs} bytes for CTR mode (got ${iv.length})`);
    }
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += bs) {
      const chunkLen = Math.min(bs, data.length - i);
      const keystream = cipher.encryptBlock(ks, counter);
      const chunk = data.subarray(i, i + chunkLen);
      for (let j = 0; j < chunkLen; j++) out[i + j] = chunk[j] ^ keystream[j];
      incCounter(counter, nonceLen, bs - nonceLen);
    }
    return out;
  }

  throw new Error(`Unsupported mode: ${mode}`);
}
