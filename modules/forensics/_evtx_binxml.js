// SPDX-License-Identifier: MIT
// HexSpindle native Windows Event Log BinXML reader. Spec: MS-EVEN6 and
// libyal/libevtx documentation. Does not execute scripts or use network APIs.
// Not a replacement for an exhaustive libevtx/evtx-rs conformance parser.
const UTF16 = new TextDecoder('utf-16le');
const ANSI = new TextDecoder('windows-1252');
const FILETIME_EPOCH = 116444736000000000n;
const BAD = (message) => { throw new Error('EVTX BinXML: ' + message); };
const xmlEscape = s => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'\uFFFD').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function check(u,p,n,end=u.length) { if (!Number.isSafeInteger(p)||p<0||n<0||p+n>Math.min(u.length,end)) BAD('truncated or out-of-range data at 0x'+p.toString(16)); }
function get(u,p,n,end) { check(u,p,n,end); return new DataView(u.buffer,u.byteOffset+p,n); }
function u16(u,p,end) {return get(u,p,2,end).getUint16(0,true);}
function u32(u,p,end) {return get(u,p,4,end).getUint32(0,true);}
function u64(u,p,end) {return get(u,p,8,end).getBigUint64(0,true);}
function t16(u,p,n,end) {check(u,p,n,end);return UTF16.decode(u.subarray(p,p+n));}
function bytesHex(u,p,n,end){check(u,p,n,end);return Array.from(u.subarray(p,p+n),x=>x.toString(16).padStart(2,'0')).join('');}
function timeFromFiletime(v){try{const ms=Number((BigInt(v)-FILETIME_EPOCH)/10000n);return Number.isFinite(ms)&&Math.abs(ms)<8640000000000000?new Date(ms).toISOString():null;}catch{return null;}}
function guid(u,p,end){check(u,p,16,end);const h=(off,n)=>bytesHex(u,p+off,n,end);return '{'+h(3,1)+h(2,1)+h(1,1)+h(0,1)+'-'+h(5,1)+h(4,1)+'-'+h(7,1)+h(6,1)+'-'+h(8,2)+'-'+h(10,6)+'}';}
function sid(u,p,n,end){check(u,p,n,end);if(n<8)return bytesHex(u,p,n,end);let s='S-'+u[p]+'-'+Array.from(u.subarray(p+2,p+8)).reduce((n,v)=>n*256+v,0);const sub=Math.min(u[p+1],(n-8)/4);for(let i=0;i<sub;i++)s+='-'+u32(u,p+8+i*4,end);return s;}
function value(u,p,n,type,end){
 check(u,p,n,end);const v=get(u,p,n,end),a=type&0x7f; if(!n||a===0)return'';
 if(type&0x80){const width={3:1,4:1,5:2,6:2,7:4,8:4,9:8,10:8,11:4,12:8,17:8}[a];if(width&&n%width===0)return Array.from({length:n/width},(_,i)=>value(u,p+i*width,width,a,end)).join(' ');}
 switch(a){
 case 1:return t16(u,p,n,end).replace(/\0+$/g,'');case 2:return ANSI.decode(u.subarray(p,p+n)).replace(/\0+$/g,'');
 case 3:return String(v.getInt8(0));case 4:return String(v.getUint8(0));
 case 5:if(n>=2)return String(v.getInt16(0,true));break;case 6:if(n>=2)return String(v.getUint16(0,true));break;
 case 7:if(n>=4)return String(v.getInt32(0,true));break;case 8:if(n>=4)return String(v.getUint32(0,true));break;
 case 9:if(n>=8)return String(v.getBigInt64(0,true));break;case 10:if(n>=8)return String(v.getBigUint64(0,true));break;
 case 11:if(n>=4)return String(v.getFloat32(0,true));break;case 12:if(n>=8)return String(v.getFloat64(0,true));break;
 case 13:if(n>=4)return v.getUint32(0,true)?'true':'false';break;
 case 14:return bytesHex(u,p,n,end);case 15:if(n>=16)return guid(u,p,end);break;
 case 16:case 20:if(n>=4)return '0x'+v.getUint32(0,true).toString(16);break;
 case 17:if(n>=8)return timeFromFiletime(v.getBigUint64(0,true))||String(v.getBigUint64(0,true));break;
 case 18:if(n>=16){const year=v.getUint16(0,true),month=v.getUint16(2,true),day=v.getUint16(6,true),h=v.getUint16(8,true),m=v.getUint16(10,true),s=v.getUint16(12,true),ms=v.getUint16(14,true);return `${year.toString().padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}Z`;}break;
 case 19:return sid(u,p,n,end);case 21:if(n>=8)return'0x'+v.getBigUint64(0,true).toString(16);break;
 }
 return bytesHex(u,p,n,end);
}
function inlineValue(u,p,end){
 check(u,p,2,end);const type=u[p+1],kind=type&0x7f;let valueStart=p+2,bytes=0;
 if(kind===1||kind===2||kind===14||kind===0x21){check(u,valueStart,2,end);const count=u16(u,valueStart,end);valueStart+=2;bytes=kind===1?count*2:count;}
 else if(kind===0){bytes=0;}
 else if([3,4].includes(kind))bytes=1;
 else if([5,6].includes(kind))bytes=2;
 else if([7,8,11,13,16,20].includes(kind))bytes=4;
 else if([9,10,12,17,21].includes(kind))bytes=8;
 else if([15,18].includes(kind))bytes=16;
 else BAD('unsupported inline BinXML value type '+kind);
 check(u,valueStart,bytes,end);
 return {result:value(u,valueStart,bytes,type,end),end:valueStart+bytes};
}
function node(name){return {name,attrs:{},children:[]};}
function nameAt(ctx, offset) {
 const p=ctx.chunk+offset, end=ctx.chunk+65536;
 check(ctx.data,p,8,end);const chars=u16(ctx.data,p+6,end);
 if(chars>16384)BAD('unreasonably long BinXML element name');
 const n=8+chars*2+2;check(ctx.data,p,n,end);
 const name=t16(ctx.data,p+8,chars*2,end);
 if(!/^[A-Za-z_][\w.:-]*$/.test(name)) BAD('invalid XML name at chunk offset 0x'+offset.toString(16));
 return {name,size:n};
}
function templateValues(ctx,p,end){
 const u=ctx.data; const count=u32(u,p,end);p+=4;
 if(count>16384||p+count*4>end)BAD('invalid BinXML substitution count');
 const desc=[];for(let i=0;i<count;i++){desc.push({size:u16(u,p+i*4,end),type:u[p+i*4+2]});}
 p+=count*4; const values=[];
 for(const d of desc){check(u,p,d.size,end);values.push({p,n:d.size,type:d.type});p+=d.size;}
 return {values,end:p};
}
function nodes(ctx,start,end,values,depth=0) {
 if(depth>64)BAD('BinXML nesting exceeds safe limit');
 const u=ctx.data, out=[],stack=[],maxTokens=100000;let p=start,tokens=0;
 const append=x=>{const top=stack.at(-1);if(top)top.children.push(x);else out.push(x);};
 const sub=(id,optional)=>{const v=values?.[id];if(!v||v.type===0){if(optional)return'';if(!v)BAD('missing substitution '+id);return'';}if((v.type&0x7f)===0x21){const n=nodes(ctx,v.p,v.p+v.n,values,depth+1);return n.content;}return value(u,v.p,v.n,v.type,ctx.chunk+65536);};
 while(p<end){if(++tokens>maxTokens)BAD('BinXML token limit exceeded');check(u,p,1,end);const tok=u[p],op=tok&0x3f;
  if(op===0){p++;break;}
  if(op===15){check(u,p,4,end);p+=4;continue;}
  if(op===1){
   check(u,p,11,end);const ptr=u32(u,p+7,end);const name=nameAt(ctx,ptr);let next=p+11;
   if(ctx.chunk+ptr===next)next+=name.size;
   // The 0x40 flag precedes attributes and includes a 4-byte attribute span.
   if(tok&0x40){check(u,next,4,end);next+=4;}
   const child=node(name.name);append(child);stack.push(child);p=next;continue;
  }
  if(op===6){check(u,p,5,end);const ptr=u32(u,p+1,end);const name=nameAt(ctx,ptr);p+=5;if(ctx.chunk+ptr===p)p+=name.size;
   const nextOp=u[p]&0x3f;let val='';
   if(nextOp===5){const info=inlineValue(u,p,end);val=info.result;p=info.end;}
   else if(nextOp===13||nextOp===14){val=sub(u16(u,p+1,end),nextOp===14);p+=4;}
   else BAD('unsupported attribute value token 0x'+u[p].toString(16));
   if(!stack.length)BAD('attribute without an element');stack.at(-1).attrs[name.name]=val;continue;
  }
  if(op===2){p++;continue;}
  if(op===3){if(!stack.length)BAD('unbalanced empty-element token');stack.pop();p++;continue;}
  if(op===4){if(!stack.length)BAD('unbalanced end-element token');stack.pop();p++;continue;}
  if(op===5){const info=inlineValue(u,p,end);append(info.result);p=info.end;continue;}
  if(op===13||op===14){check(u,p,4,end);const id=u16(u,p+1,end);const v=values?.[id];if((v?.type&0x7f)===0x21){const result=nodes(ctx,v.p,v.p+v.n,values,depth+1);for(const child of result.tree)append(child);}else append(sub(id,op===14));p+=4;continue;}
  if(op===8){const n=u16(u,p+1,end);append(String.fromCodePoint(n));p+=3;continue;}
  if(op===9){const ptr=u32(u,p+1,end);const name=nameAt(ctx,ptr);p+=5;if(ctx.chunk+ptr===p)p+=name.size;append('&'+name.name+';');continue;}
  if(op===7){const n=u16(u,p+1,end);check(u,p+3,n*2,end);append(t16(u,p+3,n*2,end));p+=3+n*2;continue;}
  if(op===12){const r=instance(ctx,p,end,depth+1);for(const child of r.tree)append(child);p=r.end;continue;}
  BAD('unsupported BinXML token 0x'+tok.toString(16)+' at 0x'+p.toString(16));
 }
 if(stack.length)BAD('unbalanced BinXML element structure');
 return {tree:out,end:p};
}
function instance(ctx,pos,end,depth=0){
 const u=ctx.data;check(u,pos,10,end);const offset=u32(u,pos+6,end),tp=ctx.chunk+offset;check(u,tp,24,ctx.chunk+65536);
 const len=u32(u,tp+20,ctx.chunk+65536);if(len<5||len>65536-24||tp+24+len>ctx.chunk+65536)BAD('invalid BinXML template length');
 let p=pos+10;
 if(tp===p){p+=24+len;check(u,p,4,end);}
 else if(tp>p&&tp<end){BAD('embedded template offset does not point to the next bytes');}
 const v=templateValues(ctx,p,end);
 const template=nodes(ctx,tp+24,tp+24+len,v.values,depth+1);
 return {tree:template.tree,end:v.end};
}
function render(n){if(typeof n==='string')return xmlEscape(n);const attrs=Object.entries(n.attrs).map(([k,v])=>` ${k}="${xmlEscape(v)}"`).join('');return '<'+n.name+attrs+'>'+n.children.map(render).join('')+'</'+n.name+'>';}
function textOf(n){if(n==null)return'';if(typeof n==='string')return n;return n.children.map(textOf).join('');}
function children(n,k){return n?.children?.filter(c=>typeof c!=='string'&&c.name===k)||[];}
function child(n,k){return children(n,k)[0];}
function leafData(n,out,depth=0){if(!n||depth>20||typeof n==='string')return;const elements=n.children.filter(x=>typeof x!=='string');if(!elements.length){const value=textOf(n);if(value)out.push({Name:n.name,value});}else for(const e of elements)leafData(e,out,depth+1);}
function normalize(tree,meta){const root=tree.find(x=>typeof x!=='string'&&x.name==='Event');if(!root)BAD('record did not render an Event root element');const sys=child(root,'System');const ev=child(root,'EventData');const user=child(root,'UserData');const data=[];for(const item of children(ev,'Data'))data.push({Name:item.attrs.Name||`Data${data.length}`,value:textOf(item)});if(user)for(const entry of user.children.filter(x=>typeof x!=='string'))leafData(entry,data);
 const eventID=Number(textOf(child(sys,'EventID')))||0, sysRecordId=textOf(child(sys,'EventRecordID')), provider=child(sys,'Provider')?.attrs?.Name||'',time=child(sys,'TimeCreated')?.attrs?.SystemTime||meta.writtenUtc||'',computer=textOf(child(sys,'Computer'));
 return {EventID:eventID,eventId:eventID,ProviderName:provider,TimeCreated:time,Computer:computer,RecordId:sysRecordId||meta.recordId,ContainerRecordId:meta.recordId,EventData:{Data:data},System:{EventID:eventID,EventRecordID:sysRecordId||meta.recordId,Provider:{Name:provider},Computer:computer,TimeCreated:{SystemTime:time},Channel:textOf(child(sys,'Channel'))},...(user?{UserData: Object.fromEntries(user.children.filter(x=>typeof x!=='string').map(x=>[x.name,textOf(x)]))}:{})};
}
/** Converts raw EVTX bytes to an XML fragment sequence or an analyzer-friendly JSON array.
 * By design this does not discard events that cannot be decoded silently.
 */
export function convertEvtx(data,format='json',maxRecords=1000,skipErrors=false){
 if(!(data instanceof Uint8Array))BAD('expected raw Uint8Array');
 check(data,0,4096);if(String.fromCharCode(...data.subarray(0,7))!=='ElfFile'||data[7]!==0)BAD('not a native .evtx file (missing ElfFile signature)');
 const out=[],issues=[],max=Math.floor(Math.min(50000,Math.max(1,Number(maxRecords)||1000)));
 const slots=Math.floor((data.length-4096)/65536);
 let found=0;
 for(let i=0;i<slots&&out.length<max;i++){
  const chunk=4096+i*65536,chunkEnd=chunk+65536;
  if(String.fromCharCode(...data.subarray(chunk,chunk+7))!=='ElfChnk'||data[chunk+7]!==0){issues.push(`Chunk ${i}: invalid chunk signature`);continue;}
  const free=Math.min(chunkEnd,chunk+Math.max(512,u32(data,chunk+48,chunkEnd)));
  let p=chunk+512;
  while(p+28<=free&&out.length<max){
   if(u32(data,p,free)!==0x2a2a)break;
   const size=u32(data,p+4,free);if(size<28||p+size>free||u32(data,p+size-4,free)!==size){issues.push(`Chunk ${i} record at 0x${p.toString(16)}: invalid frame`);break;}
   found++;const recordId=u64(data,p+8,free).toString(),writtenUtc=timeFromFiletime(u64(data,p+16,free));
   try {
    const ctx={data,chunk};const recordEnd=p+size-4;
    const body=p+24;if(data[body]!==0x0f)BAD('record does not start with BinXML fragment');
    let parsed;
    if((data[body+4]&0x3f)===12)parsed=instance(ctx,body+4,recordEnd);
    else parsed=nodes(ctx,body,recordEnd,[],0);
    if(format==='xml'){
      const root=parsed.tree.find(x=>typeof x!=='string'&&x.name==='Event');
      if(!root)BAD('record missing Event root');
      out.push(render(root));
    }else out.push(normalize(parsed.tree,{recordId,writtenUtc}));
   }catch(err){issues.push(`Chunk ${i}, record ${recordId}: ${err.message}`);if(!skipErrors)throw new Error(issues.at(-1));}
   p+=size;
  }
 }
 if(!out.length)throw new Error('No EVTX events decoded. '+(issues[0]||'File contains no records.'));
 if(issues.length)throw new Error(`${out.length} events decoded but ${issues.length} records/chunks failed. Refusing to silently return incomplete forensic evidence. First failure: ${issues[0]}`);
 return format==='xml'?'<?xml version="1.0" encoding="UTF-8"?>\n<Events>\n'+out.join('\n')+'\n</Events>':JSON.stringify(out,null,2);
}
