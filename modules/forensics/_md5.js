// SPDX-License-Identifier: MIT
// RFC 1321 MD5, used solely for PE imphash canonicalization (not a security hash).
export function md5(bytes) {
  const len = bytes.length; const size = Math.ceil((len+9)/64)*64; const b=new Uint8Array(size); b.set(bytes); b[len]=0x80;
  const d=new DataView(b.buffer),bits=BigInt(len)*8n;d.setUint32(size-8,Number(bits&0xffffffffn),true);d.setUint32(size-4,Number(bits>>32n&0xffffffffn),true);
  const K=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0);
  const S=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const rot=(x,n)=>(x<<n)|(x>>>(32-n));let a0=0x67452301,b0=0xefcdab89,c0=0x98badcfe,d0=0x10325476;
  for(let o=0;o<size;o+=64){let a=a0,b=b0,c=c0,dd=d0;for(let i=0;i<64;i++){let f,g;if(i<16){f=(b&c)|(~b&dd);g=i;}else if(i<32){f=(dd&b)|(~dd&c);g=(5*i+1)%16;}else if(i<48){f=b^c^dd;g=(3*i+5)%16;}else{f=c^(b|~dd);g=7*i%16;}const z=dd;dd=c;c=b;b=(b+rot((a+f+K[i]+d.getUint32(o+g*4,true))>>>0,S[i]))>>>0;a=z;}a0=(a0+a)>>>0;b0=(b0+b)>>>0;c0=(c0+c)>>>0;d0=(d0+dd)>>>0;}const out=new Uint8Array(16),v=new DataView(out.buffer);[a0,b0,c0,d0].forEach((x,i)=>v.setUint32(i*4,x,true));return out;
}
