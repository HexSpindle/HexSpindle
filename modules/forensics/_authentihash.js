// SPDX-License-Identifier: MIT
// Microsoft Authenticode PE image digest (SHA-256), NOT signature/trust verification.
// Source: Windows Authenticode PE Signature Format Specification (2008), steps 3-15.
const get16=(b,o)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint16(o,true);
const get32=(b,o)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(o,true);
const ascii=(b,o,n)=>String.fromCharCode(...b.subarray(o,o+n));
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
export async function peAuthenticodeImageHash(b){
 if(!(b instanceof Uint8Array)||b.length<256||b.length>128*1048576||ascii(b,0,2)!=='MZ')throw Error('Expected Windows PE file 256 bytes to 128 MiB');
 const pe=get32(b,0x3c);if(pe<0x40||pe+24>b.length||ascii(b,pe,4)!=='PE\0\0')throw Error('Missing PE header');
 const n=get16(b,pe+6),optSize=get16(b,pe+20),opt=pe+24,magic=get16(b,opt);
 if(![0x10b,0x20b].includes(magic)||n>96||opt+optSize+n*40>b.length)throw Error('Malformed PE optional/section header');
 const dd=opt+(magic===0x20b?112:96),certEntry=dd+8*4,ck=opt+64;
 if(certEntry+8>opt+optSize||ck+4>certEntry)throw Error('PE security data directory is missing/truncated');
 const hdr=get32(b,opt+60),certOff=get32(b,certEntry),certSize=get32(b,certEntry+4);
 if(hdr<opt+optSize+n*40||hdr>b.length||!hdr)throw Error('PE SizeOfHeaders is invalid');
 if((certOff===0)!==(certSize===0))throw Error('PE certificate table has incomplete offset/size');
 if(certSize&&((certOff&7)!==0||certOff<hdr||certOff+certSize>b.length))throw Error('PE certificate table has invalid range');
 const sections=[];
 for(let i=0;i<n;i++){const o=opt+optSize+i*40,size=get32(b,o+16),offset=get32(b,o+20);
  if(!size)continue;if(offset<hdr||offset+size>b.length)throw Error('PE section raw data is invalid');sections.push({offset,size});}
 sections.sort((a,b)=>a.offset-b.offset);
 for(let i=1;i<sections.length;i++)if(sections[i].offset<sections[i-1].offset+sections[i-1].size)throw Error('Overlapping PE section raw ranges');
 const parts=[b.subarray(0,ck),b.subarray(ck+4,certEntry),b.subarray(certEntry+8,hdr)];
 let sum=hdr;
 for(const s of sections){parts.push(b.subarray(s.offset,s.offset+s.size));sum+=s.size;}
 if(sum>b.length)throw Error('PE section sum exceeds input size');
 // The common Windows signing layout stores the certificate table at the end.
 // Refuse unusual/nonterminal layouts rather than silently compute a dubious hash.
 if(certSize&&certOff+certSize!==b.length)throw Error('Nonterminal certificate table not supported by strict Authenticode digest');
 const extra=b.length-sum-certSize;
 if(extra<0)throw Error('PE certificate size exceeds unaccounted file data');
 if(extra)parts.push(b.subarray(sum,sum+extra));
 const total=parts.reduce((n,p)=>n+p.length,0);const joined=new Uint8Array(total);let pos=0;
 for(const p of parts){joined.set(p,pos);pos+=p.length;}
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',joined));
 return {sha256:hex(digest),certificateTablePresent:!!certSize,certificateTableOffset:certOff,certificateTableSize:certSize,hashedBytes:total,trustVerified:false,signatureCryptographicallyVerified:false,certificateChainVerified:false,revocationChecked:false,note:'This is only the Authenticode PE image digest, NOT signature verification, signer attribution, certificate policy, or Windows WinVerifyTrust equivalence.'};
}
