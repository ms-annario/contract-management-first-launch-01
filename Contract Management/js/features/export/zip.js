/* Minimal ZIP writer used for package exports. */

function utf8Encode(str){
  if(typeof TextEncoder!=="undefined")return new TextEncoder().encode(str);
  const utf8=[];
  for(let i=0;i<str.length;i++){
    let c=str.charCodeAt(i);
    if(c<0x80)utf8.push(c);
    else if(c<0x800)utf8.push(0xc0|(c>>6),0x80|(c&0x3f));
    else if(c<0xd800||c>=0xe000)utf8.push(0xe0|(c>>12),0x80|((c>>6)&0x3f),0x80|(c&0x3f));
    else{i++;c=0x10000+(((c&0x3ff)<<10)|(str.charCodeAt(i)&0x3ff));utf8.push(0xf0|(c>>18),0x80|((c>>12)&0x3f),0x80|((c>>6)&0x3f),0x80|(c&0x3f));}
  }
  return new Uint8Array(utf8);
}
const CRC32_TABLE=new Uint32Array(256);
for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);CRC32_TABLE[i]=c>>>0;}
function crc32(bytes){let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=CRC32_TABLE[(c^bytes[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
export function createZipBlob(files){
  const d=new Date();
  const dosTime=((d.getHours()<<11)|(d.getMinutes()<<5)|(Math.floor(d.getSeconds()/2)))&0xFFFF;
  const dosDate=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  const localChunks=[];
  const cdChunks=[];
  let offset=0;

  files.forEach(f=>{
    const nameBytes=utf8Encode(f.name);
    const dataBytes=typeof f.data==="string"?utf8Encode(f.data):(f.data instanceof Uint8Array?f.data:new Uint8Array(f.data));
    const crc=crc32(dataBytes);
    const size=dataBytes.length;

    const lh=new Uint8Array(30+nameBytes.length);
    const lv=new DataView(lh.buffer);
    lv.setUint32(0,0x04034b50,true);
    lv.setUint16(4,20,true);
    lv.setUint16(6,0x0800,true);
    lv.setUint16(8,0,true);
    lv.setUint16(10,dosTime,true);
    lv.setUint16(12,dosDate,true);
    lv.setUint32(14,crc,true);
    lv.setUint32(18,size,true);
    lv.setUint32(22,size,true);
    lv.setUint16(26,nameBytes.length,true);
    lv.setUint16(28,0,true);
    lh.set(nameBytes,30);
    localChunks.push(lh,dataBytes);

    const cd=new Uint8Array(46+nameBytes.length);
    const cv=new DataView(cd.buffer);
    cv.setUint32(0,0x02014b50,true);
    cv.setUint16(4,20,true);
    cv.setUint16(6,20,true);
    cv.setUint16(8,0x0800,true);
    cv.setUint16(10,0,true);
    cv.setUint16(12,dosTime,true);
    cv.setUint16(14,dosDate,true);
    cv.setUint32(16,crc,true);
    cv.setUint32(20,size,true);
    cv.setUint32(24,size,true);
    cv.setUint16(28,nameBytes.length,true);
    cv.setUint16(30,0,true);
    cv.setUint16(32,0,true);
    cv.setUint16(34,0,true);
    cv.setUint16(36,0,true);
    cv.setUint32(38,0,true);
    cv.setUint32(42,offset,true);
    cd.set(nameBytes,46);
    cdChunks.push(cd);
    offset+=lh.length+dataBytes.length;
  });

  const cdStart=offset;
  let cdSize=0;
  cdChunks.forEach(c=>cdSize+=c.length);

  const eocd=new Uint8Array(22);
  const ev=new DataView(eocd.buffer);
  ev.setUint32(0,0x06054b50,true);
  ev.setUint16(4,0,true);
  ev.setUint16(6,0,true);
  ev.setUint16(8,files.length,true);
  ev.setUint16(10,files.length,true);
  ev.setUint32(12,cdSize,true);
  ev.setUint32(16,cdStart,true);
  ev.setUint16(20,0,true);

  const totalLength=offset+cdSize+22;
  const out=new Uint8Array(totalLength);
  let p=0;
  localChunks.forEach(c=>{out.set(c,p);p+=c.length;});
  cdChunks.forEach(c=>{out.set(c,p);p+=c.length;});
  out.set(eocd,p);

  return new Blob([out],{type:"application/zip"});
}
