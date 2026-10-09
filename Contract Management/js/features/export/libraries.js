/* Lazy loading of the docx and jsPDF libraries from CDNs. */

const LIBS={docx:"https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",pdf:"https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"};
const loaded={};
export function loadLib(k){if(!loaded[k])loaded[k]=new Promise((res,rej)=>{const s=document.createElement("script");s.src=LIBS[k];s.onload=res;s.onerror=()=>{delete loaded[k];rej(new Error("The "+(k==="pdf"?"PDF":"Word")+" library couldn't load. Check your connection and try again."));};document.head.appendChild(s);});return loaded[k];}
const capP={};
export function cap(n){if(!(n in capP))capP[n]=(window.claude&&typeof window.claude.use==="function")?Promise.resolve(window.claude.use(n)).catch(()=>null):Promise.resolve(null);return capP[n];}
cap("downloads");
cap("sample");
