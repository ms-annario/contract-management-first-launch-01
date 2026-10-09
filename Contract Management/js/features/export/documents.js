/* Word and PDF generation and file saving. */
import { cap, loadLib } from "./libraries.js";
import { toast } from "../../ui/feedback.js";

function blocks(html){const div=document.createElement("div");div.innerHTML=html;const out=[];
  const runs=el=>{const r=[];(function w(n,b,i){n.childNodes.forEach(c=>{if(c.nodeType===3){if(c.textContent)r.push({text:c.textContent,bold:b,italics:i});}else if(c.nodeType===1){if(c.tagName==="BR")r.push({text:" "});else w(c,b||/^(B|STRONG)$/.test(c.tagName),i||/^(I|EM)$/.test(c.tagName));}});})(el,false,false);return r;};
  div.childNodes.forEach(n=>{if(n.nodeType===3){if(n.textContent.trim())out.push({type:"p",runs:[{text:n.textContent}]});return;}if(n.nodeType!==1)return;const tg=n.tagName;
    if(tg==="H3")out.push({type:"h",runs:runs(n)});else if(tg==="H4")out.push({type:"h4",runs:runs(n)});
    else if(tg==="OL"||tg==="UL"){let k=0;[...n.children].filter(c=>c.tagName==="LI").forEach(li=>out.push({type:"li",ordered:tg==="OL",n:++k,runs:runs(li)}));}
    else out.push({type:"p",runs:runs(n)});});
  return out.filter(b=>b.runs.some(r=>r.text&&r.text.trim()));}
export async function buildDocx(title,meta,secs){await loadLib("docx");const X=window.docx,P=o=>new X.Paragraph(o),tr=r=>new X.TextRun({text:r.text,bold:!!r.bold,italics:!!r.italics});
  const kids=[P({spacing:{before:2400},children:[new X.TextRun({text:meta.client,size:22,color:"5A6878"})]}),P({heading:X.HeadingLevel.TITLE,children:[new X.TextRun(title)]})];
  meta.lines.forEach(l=>kids.push(P({children:[new X.TextRun({text:l,size:22})]})));
  if(secs.length>1){kids.push(P({heading:X.HeadingLevel.HEADING_1,pageBreakBefore:true,children:[new X.TextRun("Contents")]}));secs.forEach((s,i)=>kids.push(P({children:[new X.TextRun((i+1)+". "+s.name)]})));}
  secs.forEach((s,i)=>{kids.push(P({heading:X.HeadingLevel.HEADING_1,pageBreakBefore:true,children:[new X.TextRun((secs.length>1?(i+1)+". ":"")+s.name)]}));
    if(s.sub)kids.push(P({spacing:{after:200},children:[new X.TextRun({text:s.sub,italics:true,color:"5A6878",size:18})]}));
    blocks(s.html).forEach(b=>{if(b.type==="h")kids.push(P({heading:X.HeadingLevel.HEADING_2,children:b.runs.map(tr)}));else if(b.type==="h4")kids.push(P({heading:X.HeadingLevel.HEADING_3,children:b.runs.map(tr)}));
      else if(b.type==="li")kids.push(b.ordered?P({indent:{left:720,hanging:360},spacing:{after:80},children:[new X.TextRun(b.n+".  "),...b.runs.map(tr)]}):P({bullet:{level:0},children:b.runs.map(tr)}));
      else kids.push(P({spacing:{after:140},children:b.runs.map(tr)}));});});
  const header=new X.Header({children:[P({alignment:X.AlignmentType.RIGHT,children:[new X.TextRun({text:meta.header,size:16,color:"5A6878"})]})]});
  const footer=new X.Footer({children:[P({alignment:X.AlignmentType.CENTER,children:[new X.TextRun({children:["Page ",X.PageNumber.CURRENT," of ",X.PageNumber.TOTAL_PAGES],size:16,color:"5A6878"})]})]});
  return X.Packer.toBlob(new X.Document({creator:"Tender workspace",title,styles:{default:{document:{run:{font:"Calibri",size:22}}}},sections:[{headers:{default:header},footers:{default:footer},children:kids}]}));}
export async function buildPdf(title,meta,secs){await loadLib("pdf");const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"}),W=210,H=297,Mg=20,CW=W-2*Mg;let y=Mg+8;const marks=[];
  const ensure=h=>{if(y+h>H-Mg){doc.addPage();y=Mg+8;}};
  const write=(text,size,style,gap,color)=>{doc.setFont("helvetica",style||"normal");doc.setFontSize(size);doc.setTextColor(...(color||[23,34,48]));const lh=size*0.43;doc.splitTextToSize(text,CW).forEach(l=>{ensure(lh);doc.text(l,Mg,y);y+=lh;});y+=gap||0;};
  y=80;write(meta.client,11,"normal",4,[90,104,120]);write(title,24,"bold",6);meta.lines.forEach(l=>write(l,11,"normal",1.5));
  if(secs.length>1){doc.addPage();y=Mg+8;write("Contents",16,"bold",4);secs.forEach((s,i)=>write((i+1)+". "+s.name,11,"normal",1.5));}
  secs.forEach((s,i)=>{doc.addPage();y=Mg+8;const h=(secs.length>1?(i+1)+". ":"")+s.name;marks.push({t:h,p:doc.internal.getNumberOfPages()});write(h,17,"bold",2);if(s.sub)write(s.sub,9,"italic",5,[90,104,120]);
    blocks(s.html).forEach(b=>{const tx=b.runs.map(r=>r.text).join("").replace(/\s+/g," ").trim();if(b.type==="h"){y+=2;write(tx,12.5,"bold",1.5);}else if(b.type==="h4")write(tx,11,"bold",1);else if(b.type==="li")write((b.ordered?b.n+".  ":"\u2022  ")+tx,10.5,"normal",1.5);else write(tx,10.5,"normal",2.6);});});
  const n=doc.internal.getNumberOfPages();
  for(let p=1;p<=n;p++){doc.setPage(p);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(90,104,120);doc.text(meta.header,W-Mg,12,{align:"right"});doc.text("Page "+p+" of "+n,W/2,H-10,{align:"center"});}
  try{marks.forEach(m=>doc.outline.add(null,m.t,{pageNumber:m.p}));}catch(e){}
  return doc.output("blob");}
export async function saveFile(name,blob){const dl=await cap("downloads");
  if(dl){try{await dl.save({filename:name,data:blob});toast("Saved "+name);}catch(e){toast(e&&e.code==="declined"?"Download cancelled":"Downloads aren't available here ("+(e&&e.code||"error")+")");}return;}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);toast("Downloaded "+name);}
export const verHtml=(d,no)=>(d.versions[(no||d.versions.length)-1]||{html:d.html}).html;
export const slug=s=>s.replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"");
