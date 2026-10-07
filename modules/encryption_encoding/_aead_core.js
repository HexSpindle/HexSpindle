// HexSpindle AEAD core primitives.
// Browser-compatible, dependency-free implementations used by the operation wrappers.
// AES-GCM uses WebCrypto; CCM/EAX/SIV and ChaCha20-Poly1305 are implemented here.

const TE = new TextEncoder();
const TD = new TextDecoder();

export function toBytes(value, format = 'hex') {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  const s = String(value ?? '');
  switch (String(format).toLowerCase()) {
    case 'utf8': case 'utf-8': case 'text': return TE.encode(s);
    case 'base64': {
      const bin = typeof atob === 'function' ? atob(s.replace(/\s+/g, '')) : Buffer.from(s, 'base64').toString('binary');
      return Uint8Array.from(bin, c => c.charCodeAt(0));
    }
    case 'hex': default: {
      const h = s.replace(/^0x/i, '').replace(/[\s:_-]/g, '');
      if (!/^[0-9a-f]*$/i.test(h) || h.length % 2) throw new Error('Invalid hex input');
      return Uint8Array.from(h.match(/../g) || [], x => parseInt(x, 16));
    }
  }
}

export function fromBytes(bytes, format = 'hex') {
  bytes = toBytes(bytes, 'raw');
  switch (String(format).toLowerCase()) {
    case 'utf8': case 'utf-8': case 'text': return TD.decode(bytes);
    case 'base64': {
      let s = ''; for (const b of bytes) s += String.fromCharCode(b);
      return typeof btoa === 'function' ? btoa(s) : Buffer.from(bytes).toString('base64');
    }
    case 'hex': default: return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

function concat(...parts) {
  const n = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(n);
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function xor(a,b){ const o=new Uint8Array(a.length); for(let i=0;i<a.length;i++)o[i]=a[i]^b[i]; return o; }
function equalCT(a,b){ if(a.length!==b.length)return false; let d=0; for(let i=0;i<a.length;i++) d|=a[i]^b[i]; return d===0; }
function pad16(x){ return x.length%16 ? new Uint8Array(16-(x.length%16)) : new Uint8Array(0); }
function u64le(n){ let x=BigInt(n),o=new Uint8Array(8); for(let i=0;i<8;i++){o[i]=Number(x&255n);x>>=8n;} return o; }
function read32le(a,o){ return (a[o]|a[o+1]<<8|a[o+2]<<16|a[o+3]<<24)>>>0; }
function write32le(x,a,o){ a[o]=x;a[o+1]=x>>>8;a[o+2]=x>>>16;a[o+3]=x>>>24; }
function rotl32(x,n){ return ((x<<n)|(x>>>(32-n)))>>>0; }

// ---- AES block cipher (encryption only; sufficient for CTR/CMAC/CCM/EAX/SIV) ----
const SBOX = Uint8Array.from([
0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16]);
function xtime(x){ return ((x<<1)^((x&0x80)?0x1b:0))&255; }
function subWord(w){ return [SBOX[w[0]],SBOX[w[1]],SBOX[w[2]],SBOX[w[3]]]; }
function expandKey(key){
  if (![16,24,32].includes(key.length)) throw new Error('AES key must be 16, 24, or 32 bytes');
  const Nk=key.length/4, Nr=Nk+6, words=4*(Nr+1), w=Array(words);
  for(let i=0;i<Nk;i++) w[i]=[key[4*i],key[4*i+1],key[4*i+2],key[4*i+3]];
  let rc=1;
  for(let i=Nk;i<words;i++){
    let t=w[i-1].slice();
    if(i%Nk===0){ t=[t[1],t[2],t[3],t[0]]; t=subWord(t); t[0]^=rc; rc=xtime(rc); }
    else if(Nk>6 && i%Nk===4) t=subWord(t);
    w[i]=w[i-Nk].map((v,j)=>v^t[j]);
  }
  return {w,Nr};
}
function aesEncryptBlock(exp, input){
  if(input.length!==16) throw new Error('AES block must be 16 bytes');
  const s=Uint8Array.from(input), {w,Nr}=exp;
  const ark=r=>{for(let c=0;c<4;c++)for(let rr=0;rr<4;rr++)s[4*c+rr]^=w[4*r+c][rr];};
  ark(0);
  for(let r=1;r<Nr;r++){
    for(let i=0;i<16;i++) s[i]=SBOX[s[i]];
    const t=s.slice();
    for(let rr=0;rr<4;rr++)for(let c=0;c<4;c++)s[4*c+rr]=t[4*((c+rr)%4)+rr];
    for(let c=0;c<4;c++){
      const i=4*c,a=s[i],b=s[i+1],d=s[i+2],e=s[i+3], q=a^b^d^e;
      s[i]^=q^xtime(a^b); s[i+1]^=q^xtime(b^d); s[i+2]^=q^xtime(d^e); s[i+3]^=q^xtime(e^a);
    }
    ark(r);
  }
  for(let i=0;i<16;i++) s[i]=SBOX[s[i]];
  const t=s.slice(); for(let rr=0;rr<4;rr++)for(let c=0;c<4;c++)s[4*c+rr]=t[4*((c+rr)%4)+rr];
  ark(Nr); return s;
}
function inc128(c){ for(let i=15;i>=0;i--){ c[i]=(c[i]+1)&255; if(c[i]) break; } }
function aesCtr(key, iv, data){
  const exp=expandKey(key), ctr=Uint8Array.from(iv), out=new Uint8Array(data.length);
  for(let off=0;off<data.length;off+=16){ const ks=aesEncryptBlock(exp,ctr); const n=Math.min(16,data.length-off); for(let i=0;i<n;i++)out[off+i]=data[off+i]^ks[i]; inc128(ctr); }
  return out;
}
function gfDbl(b){ const o=new Uint8Array(16); let carry=0; for(let i=15;i>=0;i--){ const x=b[i]; o[i]=((x<<1)&255)|carry; carry=x>>>7; } if(carry)o[15]^=0x87; return o; }
export function aesCmac(key,msg){
  const exp=expandKey(key), L=aesEncryptBlock(exp,new Uint8Array(16)),K1=gfDbl(L),K2=gfDbl(K1);
  const n=Math.max(1,Math.ceil(msg.length/16)), complete=msg.length!==0 && msg.length%16===0; let last=new Uint8Array(16);
  if(complete){ last.set(msg.subarray(16*(n-1))); last=xor(last,K1); }
  else { const rem=msg.subarray(16*(n-1)); last.set(rem); last[rem.length]=0x80; last=xor(last,K2); }
  let x=new Uint8Array(16);
  for(let i=0;i<n-1;i++) x=aesEncryptBlock(exp,xor(x,msg.subarray(16*i,16*i+16)));
  return aesEncryptBlock(exp,xor(x,last));
}

// ---- AES-EAX ----
function eaxOmac(key,domain,data){ const p=new Uint8Array(16); p[15]=domain; return aesCmac(key,concat(p,data)); }
export function aesEaxEncrypt(key,nonce,plaintext,aad=new Uint8Array(0),tagLen=16){
  if(tagLen<4||tagLen>16)throw new Error('EAX tag length must be 4..16 bytes');
  const n=eaxOmac(key,0,nonce), h=eaxOmac(key,1,aad), c=aesCtr(key,n,plaintext), m=eaxOmac(key,2,c), tag=xor(xor(n,h),m).subarray(0,tagLen);
  return concat(c,tag);
}
export function aesEaxDecrypt(key,nonce,input,aad=new Uint8Array(0),tagLen=16){
  if(input.length<tagLen)throw new Error('Ciphertext shorter than EAX tag'); const c=input.subarray(0,input.length-tagLen),tag=input.subarray(input.length-tagLen);
  const n=eaxOmac(key,0,nonce), h=eaxOmac(key,1,aad), m=eaxOmac(key,2,c), want=xor(xor(n,h),m).subarray(0,tagLen);
  if(!equalCT(tag,want))throw new Error('EAX authentication failed'); return aesCtr(key,n,c);
}

// ---- AES-CCM (SP 800-38C / RFC 3610) ----
function encodeBE(n,len){ let x=BigInt(n),o=new Uint8Array(len); for(let i=len-1;i>=0;i--){o[i]=Number(x&255n);x>>=8n;} if(x)throw new Error('Integer too large'); return o; }
function ccmMac(key,nonce,plain,aad,tagLen){
  const L=15-nonce.length; if(L<2||L>8)throw new Error('CCM nonce must be 7..13 bytes'); if(![4,6,8,10,12,14,16].includes(tagLen))throw new Error('Invalid CCM tag length');
  if(BigInt(plain.length) >= (1n << BigInt(8*L))) throw new Error('Message too long for CCM nonce length');
  const flags=(aad.length?0x40:0)|(((tagLen-2)/2)<<3)|(L-1), b0=concat(Uint8Array.of(flags),nonce,encodeBE(plain.length,L));
  let aenc=new Uint8Array(0);
  if(aad.length){ let prefix; if(aad.length<0xff00)prefix=encodeBE(aad.length,2); else if(aad.length<=0xffffffff)prefix=concat(Uint8Array.of(0xff,0xfe),encodeBE(aad.length,4)); else prefix=concat(Uint8Array.of(0xff,0xff),encodeBE(aad.length,8)); aenc=concat(prefix,aad,pad16(concat(prefix,aad))); }
  const body=concat(b0,aenc,plain,pad16(plain)), exp=expandKey(key); let x=new Uint8Array(16);
  for(let off=0;off<body.length;off+=16)x=aesEncryptBlock(exp,xor(x,body.subarray(off,off+16)));
  return x.subarray(0,tagLen);
}
function ccmCtrBlock(nonce,counter){ const L=15-nonce.length; return concat(Uint8Array.of(L-1),nonce,encodeBE(counter,L)); }
function ccmCrypt(key,nonce,data){ const exp=expandKey(key),out=new Uint8Array(data.length); let ctr=1; for(let off=0;off<data.length;off+=16,ctr++){ const ks=aesEncryptBlock(exp,ccmCtrBlock(nonce,ctr)); for(let i=0;i<Math.min(16,data.length-off);i++)out[off+i]=data[off+i]^ks[i]; } return out; }
export function aesCcmEncrypt(key,nonce,plain,aad=new Uint8Array(0),tagLen=16){ const mac=ccmMac(key,nonce,plain,aad,tagLen),s0=aesEncryptBlock(expandKey(key),ccmCtrBlock(nonce,0)),tag=xor(mac,s0.subarray(0,tagLen)); return concat(ccmCrypt(key,nonce,plain),tag); }
export function aesCcmDecrypt(key,nonce,input,aad=new Uint8Array(0),tagLen=16){ if(input.length<tagLen)throw new Error('Ciphertext shorter than CCM tag'); const c=input.subarray(0,input.length-tagLen),tag=input.subarray(input.length-tagLen),plain=ccmCrypt(key,nonce,c),mac=ccmMac(key,nonce,plain,aad,tagLen),s0=aesEncryptBlock(expandKey(key),ccmCtrBlock(nonce,0)),want=xor(mac,s0.subarray(0,tagLen)); if(!equalCT(tag,want))throw new Error('CCM authentication failed'); return plain; }

// ---- AES-SIV (RFC 5297) ----
function s2v(macKey,ads,plain){
  let d=aesCmac(macKey,new Uint8Array(16));
  for(const ad of ads) d=xor(gfDbl(d),aesCmac(macKey,ad));
  if(plain.length>=16){ const t=Uint8Array.from(plain); for(let i=0;i<16;i++)t[t.length-16+i]^=d[i]; return aesCmac(macKey,t); }
  const p=new Uint8Array(16); p.set(plain); p[plain.length]=0x80; return aesCmac(macKey,xor(gfDbl(d),p));
}
export function aesSivEncrypt(key,plain,associated=[]){ if(![32,48,64].includes(key.length))throw new Error('AES-SIV key must be 32, 48, or 64 bytes'); const h=key.length/2,k1=key.subarray(0,h),k2=key.subarray(h),v=s2v(k1,associated,plain),q=Uint8Array.from(v); q[8]&=0x7f;q[12]&=0x7f; return concat(v,aesCtr(k2,q,plain)); }
export function aesSivDecrypt(key,input,associated=[]){ if(input.length<16)throw new Error('AES-SIV input too short'); const h=key.length/2,k1=key.subarray(0,h),k2=key.subarray(h),v=input.subarray(0,16),q=Uint8Array.from(v); q[8]&=0x7f;q[12]&=0x7f; const p=aesCtr(k2,q,input.subarray(16)),want=s2v(k1,associated,p); if(!equalCT(v,want))throw new Error('AES-SIV authentication failed'); return p; }

// ---- AES-GCM via WebCrypto ----
async function subtle(){ if(globalThis.crypto?.subtle)return globalThis.crypto.subtle; try{return (await import('node:crypto')).webcrypto.subtle;}catch{throw new Error('WebCrypto AES-GCM unavailable');} }
export async function aesGcmEncrypt(key,nonce,plain,aad=new Uint8Array(0),tagLen=16){ if(![16,24,32].includes(key.length))throw new Error('AES-GCM key must be 16, 24, or 32 bytes'); const s=await subtle(),k=await s.importKey('raw',key,{name:'AES-GCM'},false,['encrypt']); const out=await s.encrypt({name:'AES-GCM',iv:nonce,additionalData:aad,tagLength:tagLen*8},k,plain); return new Uint8Array(out); }
export async function aesGcmDecrypt(key,nonce,input,aad=new Uint8Array(0),tagLen=16){ const s=await subtle(),k=await s.importKey('raw',key,{name:'AES-GCM'},false,['decrypt']); try{return new Uint8Array(await s.decrypt({name:'AES-GCM',iv:nonce,additionalData:aad,tagLength:tagLen*8},k,input));}catch{throw new Error('GCM authentication failed');} }

// ---- ChaCha20 / HChaCha20 / Poly1305 ----
function qr(s,a,b,c,d){ s[a]=(s[a]+s[b])>>>0;s[d]=rotl32(s[d]^s[a],16);s[c]=(s[c]+s[d])>>>0;s[b]=rotl32(s[b]^s[c],12);s[a]=(s[a]+s[b])>>>0;s[d]=rotl32(s[d]^s[a],8);s[c]=(s[c]+s[d])>>>0;s[b]=rotl32(s[b]^s[c],7); }
function chachaState(key,nonce,counter){ if(key.length!==32||nonce.length!==12)throw new Error('ChaCha20 requires 32-byte key and 12-byte nonce'); const s=new Uint32Array(16); s.set([0x61707865,0x3320646e,0x79622d32,0x6b206574]); for(let i=0;i<8;i++)s[4+i]=read32le(key,4*i); s[12]=counter>>>0; for(let i=0;i<3;i++)s[13+i]=read32le(nonce,4*i); return s; }
function rounds20(x){ for(let i=0;i<10;i++){ qr(x,0,4,8,12);qr(x,1,5,9,13);qr(x,2,6,10,14);qr(x,3,7,11,15);qr(x,0,5,10,15);qr(x,1,6,11,12);qr(x,2,7,8,13);qr(x,3,4,9,14);} }
function chachaBlock(key,nonce,counter){ const s=chachaState(key,nonce,counter),x=new Uint32Array(s); rounds20(x); const out=new Uint8Array(64); for(let i=0;i<16;i++)write32le((x[i]+s[i])>>>0,out,4*i); return out; }
function chachaXor(key,nonce,counter,data){ const out=new Uint8Array(data.length); for(let off=0;off<data.length;off+=64,counter++){const b=chachaBlock(key,nonce,counter);for(let i=0;i<Math.min(64,data.length-off);i++)out[off+i]=data[off+i]^b[i];} return out; }
function leBig(bytes){ let n=0n; for(let i=bytes.length-1;i>=0;i--)n=(n<<8n)|BigInt(bytes[i]); return n; }
function bigLe(n,len){ const o=new Uint8Array(len); for(let i=0;i<len;i++){o[i]=Number(n&255n);n>>=8n;} return o; }
function poly1305(msg,key){
  if(key.length!==32)throw new Error('Poly1305 key must be 32 bytes');
  const r=leBig(key.subarray(0,16)) & 0x0ffffffc0ffffffc0ffffffc0fffffffn, s=leBig(key.subarray(16)),p=(1n<<130n)-5n; let a=0n;
  for(let off=0;off<msg.length;off+=16){ const b=msg.subarray(off,Math.min(off+16,msg.length)); const n=leBig(b)+(1n<<BigInt(8*b.length)); a=((a+n)*r)%p; }
  return bigLe((a+s)&((1n<<128n)-1n),16);
}
function chaMacData(aad,c){ return concat(aad,pad16(aad),c,pad16(c),u64le(aad.length),u64le(c.length)); }
export function chacha20Poly1305Encrypt(key,nonce,plain,aad=new Uint8Array(0)){ const otk=chachaBlock(key,nonce,0).subarray(0,32),c=chachaXor(key,nonce,1,plain),tag=poly1305(chaMacData(aad,c),otk); return concat(c,tag); }
export function chacha20Poly1305Decrypt(key,nonce,input,aad=new Uint8Array(0)){ if(input.length<16)throw new Error('Ciphertext too short'); const c=input.subarray(0,input.length-16),tag=input.subarray(input.length-16),otk=chachaBlock(key,nonce,0).subarray(0,32),want=poly1305(chaMacData(aad,c),otk); if(!equalCT(tag,want))throw new Error('ChaCha20-Poly1305 authentication failed'); return chachaXor(key,nonce,1,c); }
function hchacha20(key,nonce16){ if(key.length!==32||nonce16.length!==16)throw new Error('HChaCha20 needs 32-byte key and 16-byte nonce'); const x=new Uint32Array(16); x.set([0x61707865,0x3320646e,0x79622d32,0x6b206574]); for(let i=0;i<8;i++)x[4+i]=read32le(key,4*i); for(let i=0;i<4;i++)x[12+i]=read32le(nonce16,4*i); rounds20(x); const out=new Uint8Array(32),idx=[0,1,2,3,12,13,14,15]; idx.forEach((j,i)=>write32le(x[j],out,4*i)); return out; }
function xparts(key,nonce24){ if(nonce24.length!==24)throw new Error('XChaCha20 nonce must be 24 bytes'); return [hchacha20(key,nonce24.subarray(0,16)),concat(new Uint8Array(4),nonce24.subarray(16))]; }
export function xchacha20Poly1305Encrypt(key,nonce24,plain,aad=new Uint8Array(0)){ const [k,n]=xparts(key,nonce24); return chacha20Poly1305Encrypt(k,n,plain,aad); }
export function xchacha20Poly1305Decrypt(key,nonce24,input,aad=new Uint8Array(0)){ const [k,n]=xparts(key,nonce24); return chacha20Poly1305Decrypt(k,n,input,aad); }

export { concat, equalCT };
