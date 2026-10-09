/* Package delivery: ZIP/Word/PDF export and the send dialog. */
import { log } from "../../core/activity.js";
import { D, PK, T, U, projOf, spOf, tenderDivisionEmail } from "../../core/model.js";
import { ACT } from "../../core/registry.js";
import { S, save } from "../../core/store.js";
import { buildDocx, buildPdf, saveFile, slug, verHtml } from "./documents.js";
import { createZipBlob } from "./zip.js";
import { M, openModal, toast } from "../../ui/feedback.js";
import { esc, fmtD } from "../../ui/format.js";

function buildPackageZip(p,t){
  const items=p.items.map(it=>({it,d:D(it.docId)})).filter(x=>x.d);

  const files=[];
  const ms=S.metrics.filter(m=>m.tenderId===t.id);
  const proj=projOf(t);
  const sp=spOf(t);
  const icUser=U(t.icId);

  let transmittal="================================================================================\n"+
    "TENDER PACKAGE TRANSMITTAL & CONTENTS SUMMARY\n"+
    "================================================================================\n\n"+
    "Project:            "+(proj?proj.code+" "+proj.title:"N/A")+"\n"+
    "Sub-Project:        "+(sp?sp.name:"N/A")+"\n"+
    "Tender Code:        "+t.code+"\n"+
    "Tender Title:       "+t.title+"\n"+
    "Package Version:    Version "+p.version+"\n"+
    "Package Status:     "+p.status+(p.tecApproved?" (TEC Approved)":"")+"\n"+
    "Generated Date:     "+new Date().toLocaleString()+"\n"+
    "Contract IC:        "+(icUser?icUser.name+" ("+icUser.email+")":"Unassigned")+"\n"+
    "Procurement Route:  "+(t.route||"Traditional")+"\n"+
    "Total Documents:    "+items.length+"\n\n"+
    "--------------------------------------------------------------------------------\n"+
    "TABLE OF INCLUDED DOCUMENTS\n"+
    "--------------------------------------------------------------------------------\n";

  items.forEach((x,i)=>{
    const appr=x.d.approvals.filter(a=>a.decision==="Approved").slice(-1)[0];
    const apprStr=appr?"Approved by "+(U(appr.approverId)?U(appr.approverId).name:appr.approverId)+" on "+fmtD(appr.at):"Pending";
    transmittal+=(i+1)+". "+x.d.name+"\n"+
      "   - Type/Spec: "+(x.d.spec||"Standard")+"\n"+
      "   - Version: v"+x.it.versionNo+"\n"+
      "   - Audience: "+(x.d.audience||"Tenderers")+"\n"+
      "   - Owner: "+(U(x.d.ownerId)?U(x.d.ownerId).name:"Unknown")+"\n"+
      "   - Status: "+apprStr+"\n";
    if(x.d.fileName)transmittal+="   - Attachment File: "+x.d.fileName+"\n";
    transmittal+="\n";
  });

  if(ms.length){
    transmittal+="--------------------------------------------------------------------------------\n"+
      "SUCCESS METRICS\n"+
      "--------------------------------------------------------------------------------\n";
    ms.forEach((m,i)=>{
      transmittal+=(i+1)+". "+m.metric+"\n"+
        "   - Target: "+m.target+"\n"+
        "   - Rationale: "+(m.rationale||"N/A")+"\n";
    });
    transmittal+="\n";
  }

  transmittal+="================================================================================\n"+
    "End of Transmittal\n"+
    "================================================================================\n";

  files.push({name:"00_Transmittal_"+slug(t.code)+"_v"+p.version+".txt",data:transmittal});

  items.forEach((x,i)=>{
    const num=String(i+1).padStart(2,"0");
    const d=x.d;
    const bodyHtml=verHtml(d,x.it.versionNo);
    const appr=d.approvals.filter(a=>a.decision==="Approved").slice(-1)[0];
    const apprStr=appr?"Approved by "+(U(appr.approverId)?U(appr.approverId).name:appr.approverId)+" on "+fmtD(appr.at):"";

    const docPage='<!DOCTYPE html>\n<html lang="en">\n<head>\n'+
      '<meta charset="utf-8">\n'+
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n'+
      '<title>'+esc(d.name)+' — '+esc(t.code)+'</title>\n'+
      '<style>\n'+
      '  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 24px; color: #1e293b; line-height: 1.6; }\n'+
      '  .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }\n'+
      '  .badge { display: inline-block; padding: 3px 9px; border-radius: 999px; background: #e0f2fe; color: #0284c7; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }\n'+
      '  h1 { font-size: 26px; margin: 10px 0 8px 0; color: #0f172a; }\n'+
      '  .meta { color: #64748b; font-size: 13px; display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }\n'+
      '  .content { font-size: 15px; margin-top: 20px; }\n'+
      '  h2, h3, h4 { color: #0f172a; margin-top: 24px; margin-bottom: 8px; }\n'+
      '  ol, ul { padding-left: 24px; }\n'+
      '  li { margin-bottom: 6px; }\n'+
      '  table { border-collapse: collapse; width: 100%; margin: 16px 0; }\n'+
      '  th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 14px; }\n'+
      '  th { background: #f8fafc; font-weight: 600; }\n'+
      '  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }\n'+
      '</style>\n</head>\n<body>\n'+
      '<div class="header">\n'+
      '  <span class="badge">'+esc(d.spec||"Document")+' &bull; v'+x.it.versionNo+'</span>\n'+
      '  <h1>'+esc(d.name)+'</h1>\n'+
      '  <div class="meta">\n'+
      '    <span><b>Contract:</b> '+esc(t.code+" "+t.title)+'</span>\n'+
      '    <span><b>Audience:</b> '+esc(d.audience||"Tenderers")+'</span>\n'+
      '    <span><b>Owner:</b> '+(U(d.ownerId)?esc(U(d.ownerId).name):"")+'</span>\n'+
      '    '+(apprStr?'<span><b>Status:</b> '+esc(apprStr)+'</span>':'')+'\n'+
      '  </div>\n'+
      '</div>\n'+
      '<div class="content">\n'+bodyHtml+'\n</div>\n'+
      '<div class="footer">Tender package v'+p.version+' &bull; '+esc(t.code)+' &bull; Harbourline Tender Management</div>\n'+
      '</body>\n</html>';

    files.push({name:"documents/"+num+"_"+slug(d.name)+"_v"+x.it.versionNo+".html",data:docPage});

    if(d.fileName){
      files.push({
        name:"attachments/"+num+"_"+d.fileName,
        data:"Attachment record for "+d.name+" ("+d.fileName+")\nUploaded: "+fmtD(d.updatedAt||d.createdAt)+"\nDocument: "+d.name+"\nContent: "+(d.html?d.html.replace(/<[^>]+>/g," ").trim():"File attachment")
      });
    }
  });

  const combinedHtml='<!DOCTYPE html>\n<html lang="en">\n<head>\n'+
    '<meta charset="utf-8">\n'+
    '<title>'+esc(t.code+" "+t.title)+' — Package v'+p.version+'</title>\n'+
    '<style>\n'+
    '  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 24px; color: #1e293b; line-height: 1.6; }\n'+
    '  h1 { font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }\n'+
    '  .doc-sec { margin-top: 40px; padding-top: 24px; border-top: 1px dashed #cbd5e1; page-break-before: always; }\n'+
    '  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #e0f2fe; color: #0284c7; font-size: 11px; font-weight: 600; }\n'+
    '  .meta { color: #64748b; font-size: 13px; margin-bottom: 12px; }\n'+
    '</style>\n</head>\n<body>\n'+
    '<h1>'+esc(t.code+" "+t.title)+' — Tender Package v'+p.version+'</h1>\n'+
    '<div class="meta">Generated: '+new Date().toLocaleString()+' &bull; Status: '+p.status+'</div>\n'+
    items.map((x,i)=>
      '<div class="doc-sec">\n'+
      '  <span class="badge">Document '+(i+1)+' &bull; v'+x.it.versionNo+'</span>\n'+
      '  <h2>'+esc(x.d.name)+'</h2>\n'+
      '  <div class="content">'+verHtml(x.d,x.it.versionNo)+'</div>\n'+
      '</div>'
    ).join("\n")+
    '\n</body>\n</html>';

  files.push({name:"Complete_Package_v"+p.version+".html",data:combinedHtml});
  return createZipBlob(files);
}
function openPackageDeliveryModal(p,t,initialFormat){
  const tdEmail=tenderDivisionEmail();
  const initFmt=initialFormat||"zip";
  const defSubj="["+t.code+"] "+t.title+" — Tender Package v"+p.version;
  const defNotes="Please find attached tender package v"+p.version+" for "+t.code+" "+t.title+" prepared for tender division review and issuance.";

  openModal({
    title:"Download or Send Package v"+p.version,
    wide:true,
    submit:"Download directly",
    body:
      '<div class="delivery-modal-wrap u-d-flex u-flex-col u-gap-18">'+
        '<div class="field u-m-0">'+
          '<label class="u-fs-13 u-fw-650 u-mb-6 u-d-block">File format</label>'+
          '<div class="u-d-grid u-cols-3 u-gap-10">'+
            '<label class="opt-format" id="optFmtDocx" style="border:1.5px solid '+(initFmt==='docx'?'var(--marker-ink,#3b82f6)':'var(--rule)')+';background:'+(initFmt==='docx'?'var(--marker-soft,rgba(59,130,246,0.08))':'var(--surface)')+';border-radius:8px;padding:10px 12px;cursor:pointer;display:flex;flex-direction:column;gap:3px;transition:all .15s ease;">'+
              '<div class="u-d-flex u-items-center u-gap-6">'+
                '<input type="radio" name="format" value="docx" '+(initFmt==='docx'?'checked':'')+' class="u-m-0">'+
                '<b class="u-fs-13">Word (.docx)</b>'+
              '</div>'+
            '</label>'+
            '<label class="opt-format" id="optFmtPdf" style="border:1.5px solid '+(initFmt==='pdf'?'var(--marker-ink,#3b82f6)':'var(--rule)')+';background:'+(initFmt==='pdf'?'var(--marker-soft,rgba(59,130,246,0.08))':'var(--surface)')+';border-radius:8px;padding:10px 12px;cursor:pointer;display:flex;flex-direction:column;gap:3px;transition:all .15s ease;">'+
              '<div class="u-d-flex u-items-center u-gap-6">'+
                '<input type="radio" name="format" value="pdf" '+(initFmt==='pdf'?'checked':'')+' class="u-m-0">'+
                '<b class="u-fs-13">PDF (.pdf)</b>'+
              '</div>'+
            '</label>'+
            '<label class="opt-format" id="optFmtZip" style="border:1.5px solid '+(initFmt==='zip'?'var(--marker-ink,#3b82f6)':'var(--rule)')+';background:'+(initFmt==='zip'?'var(--marker-soft,rgba(59,130,246,0.08))':'var(--surface)')+';border-radius:8px;padding:10px 12px;cursor:pointer;display:flex;flex-direction:column;gap:3px;transition:all .15s ease;">'+
              '<div class="u-d-flex u-items-center u-gap-6">'+
                '<input type="radio" name="format" value="zip" '+(initFmt==='zip'?'checked':'')+' class="u-m-0">'+
                '<b class="u-fs-13">ZIP Archive (.zip)</b>'+
              '</div>'+
            '</label>'+
          '</div>'+
        '</div>'+
        '<div class="field u-m-0">'+
          '<label class="u-fs-13 u-fw-650 u-mb-6 u-d-block">How would you like to receive the documents?</label>'+
          '<div class="u-d-grid u-cols-1fr-1fr u-gap-12">'+
            '<label id="lblDelDownload" class="u-border-2-solid-marker-ink u-bg-marker-soft u-rounded-8 u-p-12-14 u-cursor-pointer u-d-block u-transition-all">'+
              '<div class="u-d-flex u-items-center u-gap-8">'+
                '<input type="radio" name="deliveryMethod" value="download" checked class="u-m-0">'+
                '<b class="u-fs-14">Download directly</b>'+
              '</div>'+
            '</label>'+
            '<label id="lblDelEmail" class="u-border-1p5-solid-rule u-bg-surface u-rounded-8 u-p-12-14 u-cursor-pointer u-d-block u-transition-all">'+
              '<div class="u-d-flex u-items-center u-gap-8">'+
                '<input type="radio" name="deliveryMethod" value="email" class="u-m-0">'+
                '<b class="u-fs-14">Send via email</b>'+
              '</div>'+
            '</label>'+
          '</div>'+
        '</div>'+
      '</div>',
    onSubmit: async fd => {
      const method=fd.get("deliveryMethod")||"download";
      const f=fd.get("format")||"zip";
      const fmtShort={docx:"Word",pdf:"PDF",zip:"ZIP"}[f]||f.toUpperCase();

      const items=p.items.map(it=>({it,d:D(it.docId)})).filter(x=>x.d);

      const secs=items.map(({it,d})=>{
        const a=d.approvals.filter(x=>x.decision==="Approved").slice(-1)[0];
        return {
          name:d.name,
          html:verHtml(d,it.versionNo),
          sub:"Version "+it.versionNo+", "+(d.audience==="Internal"?"internal, not for tenderers":"for tenderers")+(a?", approved by "+U(a.approverId).name+" on "+fmtD(a.at):"")
        };
      });
      const ms=S.metrics.filter(m=>m.tenderId===t.id);
      if(ms.length)secs.push({name:"Success metrics",html:"<ol>"+ms.map(m=>"<li><b>"+esc(m.metric)+"</b>: "+esc(m.target)+"</li>").join("")+"</ol>",sub:"Accepted by the contract project IC"});

      const meta={
        client:projOf(t).client,
        header:t.code+" "+t.title+", package v"+p.version,
        lines:["Contract "+t.code,"Package version "+p.version,"Contract project IC: "+(U(t.icId)?U(t.icId).name:"Unassigned"),"Generated "+fmtD(Date.now())]
      };
      let blob;
      if(f==="zip"){
        blob=buildPackageZip(p,t);
      }else if(f==="pdf"){
        blob=await buildPdf(t.code+" "+t.title,meta,secs);
      }else{
        blob=await buildDocx(t.code+" "+t.title,meta,secs);
      }

      const outName=slug(t.code+"-package-v"+p.version)+"."+f;
      await saveFile(outName,blob);
      if(method==="email"){
        // Open the user's own email app, addressed to Tender Division; they attach the downloaded file
        const subj=defSubj+" ("+fmtShort+")";
        const body=defNotes+"\n\nAttachment: "+outName;
        const a=document.createElement("a");a.href="mailto:"+encodeURIComponent(tdEmail)+"?subject="+encodeURIComponent(subj)+"&body="+encodeURIComponent(body);a.click();
        log(t,"downloaded package v"+p.version+" as "+fmtShort+" and opened an email to Tender Division");
        toast("Email opened. Attach "+outName+" before sending");
      }else{
        log(t,"downloaded package v"+p.version+" as "+fmtShort+" directly");
      }
      save();
    }
  });

  const f=M.querySelector("form");
  const syncPkgUI=()=>{
    const method=f.querySelector('input[name="deliveryMethod"]:checked')?.value||'download';
    const fmt=f.querySelector('input[name="format"]:checked')?.value||'zip';
    const fmtShort={docx:"Word",pdf:"PDF",zip:"ZIP"}[fmt]||fmt.toUpperCase();

    ['docx','pdf','zip'].forEach(k=>{
      const card=f.querySelector('#optFmt'+k.charAt(0).toUpperCase()+k.slice(1));
      if(card){
        const active=fmt===k;
        card.style.borderColor=active?'var(--marker-ink,#3b82f6)':'var(--rule)';
        card.style.background=active?'var(--marker-soft,rgba(59,130,246,0.08))':'var(--surface)';
      }
    });

    const lblDl=f.querySelector('#lblDelDownload');
    const lblEm=f.querySelector('#lblDelEmail');
    if(lblDl&&lblEm){
      lblDl.style.borderColor=method==='download'?'var(--marker-ink,#3b82f6)':'var(--rule)';
      lblDl.style.background=method==='download'?'var(--marker-soft,rgba(59,130,246,0.08))':'var(--surface)';
      lblEm.style.borderColor=method==='email'?'var(--marker-ink,#3b82f6)':'var(--rule)';
      lblEm.style.background=method==='email'?'var(--marker-soft,rgba(59,130,246,0.08))':'var(--surface)';
    }

    const sBtn=M.querySelector('.mf button[value="ok"]');
    if(sBtn){
      if(method==='download'){
        sBtn.textContent='Download '+fmtShort;
      }else{
        sBtn.textContent='Download '+fmtShort+' & open email';
      }
    }
  };

  f.querySelectorAll('input[name="format"], input[name="deliveryMethod"]').forEach(inp=>{
    inp.addEventListener('change',syncPkgUI);
  });
  syncPkgUI();
}
ACT.exportPkg=el=>{
  const p=PK(el.dataset.id);
  if(!p)return;
  const t=T(p.tenderId);
  openPackageDeliveryModal(p,t,el.dataset.f||"zip");
};
