/* Document library page, search and upload. */
import { log } from "../core/activity.js";
import { DS, ROLE_OF, isApproved } from "../core/constants.js";
import { PR, T, U, byId, projOf, spOf } from "../core/model.js";
import { ACT, route } from "../core/registry.js";
import { rerender } from "../core/router.js";
import { S, save, uid } from "../core/store.js";
import { docNeeds } from "../core/tasks.js";
import { M, openModal, toast } from "../ui/feedback.js";
import { esc, fmtDT, uname } from "../ui/format.js";
import { adot, updTxt } from "../ui/markup.js";
import { initSortableHeaders } from "../ui/table-sort.js";

/* ---------- Document library ---------- */
let LIB_SEARCH="";
function docMatchesSearch(d){
  if(!LIB_SEARCH)return true;
  const q=LIB_SEARCH.toLowerCase();
  const nameMatch=d.name&&d.name.toLowerCase().includes(q);
  const fileMatch=d.fileName&&d.fileName.toLowerCase().includes(q);
  const t=T(d.tenderId);
  const tenderMatch=t&&((t.code&&t.code.toLowerCase().includes(q))||(t.title&&t.title.toLowerCase().includes(q)));
  const sp=t?spOf(t):null;
  const spMatch=sp&&sp.name&&sp.name.toLowerCase().includes(q);
  const p=t?projOf(t):null;
  const pMatch=p&&((p.code&&p.code.toLowerCase().includes(q))||(p.name&&p.name.toLowerCase().includes(q)));
  const cat=d.catId?byId(S.catalogue,d.catId):null;
  const typeMatch=cat&&cat.name&&cat.name.toLowerCase().includes(q);
  const ownerMatch=d.ownerId&&U(d.ownerId)&&U(d.ownerId).name.toLowerCase().includes(q);
  const pastMatch=!t&&d.past&&[d.past.project,d.past.sp,d.past.tender].some(x=>x&&x.toLowerCase().includes(q));
  return nameMatch||fileMatch||tenderMatch||spMatch||pMatch||typeMatch||ownerMatch||pastMatch;
}
function highlightSearch(text,q){
  if(!q)return esc(text||"");
  const s=text||"";
  const idx=s.toLowerCase().indexOf(q.toLowerCase());
  if(idx===-1)return esc(s);
  return esc(s.slice(0,idx))+'<mark class="u-bg-ffd166 u-text-111 u-rounded-2 u-p-0-2">'+esc(s.slice(idx,idx+q.length))+'</mark>'+esc(s.slice(idx+q.length));
}
function libDocRow(d){
  const t=T(d.tenderId);
  const sp=t?spOf(t):null;
  const p=t?projOf(t):null;
  const cat=d.catId?byId(S.catalogue,d.catId):null;
  const docType=cat?cat.name:(d.spec?d.spec+(d.spec.toLowerCase().includes("spec")?"":" specification"):"Document");
  const docName=(cat&&d.name===cat.name&&t)?t.code+" "+d.name:d.name;
  const past=!t&&d.past?d.past:null;

  return '<tr>'+
    '<td>'+(p?'<a href="#/search/'+p.id+'" class="u-fw-600 u-text-inherit u-decoration-none">'+highlightSearch(p.name,LIB_SEARCH)+'</a>':past&&past.project?'<span class="u-fw-600">'+highlightSearch(past.project,LIB_SEARCH)+'</span>':'<span class="muted">–</span>')+'</td>'+
    '<td>'+(sp?(p?'<a href="#/search/'+p.id+'/'+sp.id+'" class="u-text-inherit u-decoration-none">'+highlightSearch(sp.name,LIB_SEARCH)+'</a>':highlightSearch(sp.name,LIB_SEARCH)):past&&past.sp?highlightSearch(past.sp,LIB_SEARCH):'<span class="muted">–</span>')+'</td>'+
    '<td><a href="#/doc/'+d.id+'" class="u-fw-600 u-text-inherit u-decoration-none"><b>'+highlightSearch(docName,LIB_SEARCH)+'</b></a>'+adot(docNeeds(d))+'</td>'+
    '<td>'+highlightSearch(docType,LIB_SEARCH)+(d.audience==="Internal"?' <span class="tag">Internal</span>':'')+'</td>'+
    '<td>'+(d.ownerId?highlightSearch(uname(d.ownerId),LIB_SEARCH):'<span class="muted">Unassigned</span>')+'</td>'+
    '<td class="nowrap small">'+updTxt(d)+'</td>'+
    '<td class="c"><a class="circle-btn" href="#/doc/'+d.id+'" title="Open '+esc(docName)+'" aria-label="Open '+esc(docName)+'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></a></td>'+
  '</tr>';
}
function renderDocumentLibraryTable(){
  const allApproved=S.docs.filter(isApproved);
  const filteredDocs=allApproved.filter(docMatchesSearch);

  if(!allApproved.length){
    return '<div class="empty">No approved documents in the library. Documents will be recorded here once approved.</div>';
  }
  if(LIB_SEARCH&&!filteredDocs.length){
    return '<div class="empty u-p-36-20">'+
      '<p class="u-m-0-0-10">No approved documents found matching &ldquo;<b>'+esc(LIB_SEARCH)+'</b>&rdquo;.</p>'+
      '<button type="button" class="btn sec sm" data-act="clearLibSearch">Clear search</button>'+
    '</div>';
  }

  const origin=d=>{const t=T(d.tenderId),sp=t?spOf(t):null,p=sp?PR(sp.projectId):null,past=d.past||{};
    return {p:p?p.name:(!t&&past.project)||"",sp:sp?sp.name:(!t&&past.sp)||""};};
  const sortedDocs=[...filteredDocs].sort((a,b)=>{
    const oa=origin(a), ob=origin(b);
    const pCmp=oa.p.localeCompare(ob.p);
    if(pCmp!==0)return pCmp;
    const spCmp=oa.sp.localeCompare(ob.sp);
    if(spCmp!==0)return spCmp;
    return (a.name||"").localeCompare(b.name||"");
  });

  return '<div class="scroll"><table class="t"><thead><tr>'+
    '<th>Master project</th>'+
    '<th>Sub project</th>'+
    '<th>Document name</th>'+
    '<th>Document type</th>'+
    '<th>Owner</th>'+
    '<th>Last updated</th>'+
    '<th class="no-sort u-w-40"></th>'+
  '</tr></thead><tbody>'+
  sortedDocs.map(libDocRow).join("")+
  '</tbody></table></div>';
}
function updateLibTable(){
  const view=document.getElementById("libTableView");
  if(view)view.innerHTML=renderDocumentLibraryTable();
  const meta=document.getElementById("libSearchMeta");
  if(meta){
    const allApproved=S.docs.filter(isApproved);
    const matched=allApproved.filter(docMatchesSearch);
    meta.innerHTML=LIB_SEARCH?'Showing <b>'+matched.length+'</b> of '+allApproved.length:allApproved.length+' '+(allApproved.length===1?'document':'documents');
  }
  initSortableHeaders();
}
ACT.libSearch=el=>{
  LIB_SEARCH=el.value.trim().toLowerCase();
  const clr=document.getElementById("libSearchClear");
  if(clr)clr.style.display=LIB_SEARCH?"block":"none";
  updateLibTable();
};
ACT.clearLibSearch=()=>{
  LIB_SEARCH="";
  const inp=document.getElementById("libSearchInp");
  if(inp){inp.value="";if(inp.focus)inp.focus();}
  const clr=document.getElementById("libSearchClear");
  if(clr)clr.style.display="none";
  updateLibTable();
};
route("library",()=>{
  const allApproved=S.docs.filter(isApproved);
  const matchedDocs=allApproved.filter(docMatchesSearch);

  return '<div class="head"><div><h1>Document library</h1></div>'+
    '<div class="acts"><button class="btn" data-act="uploadDoc"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="u-mr-6 u-va-n2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>Upload document</button></div>'+
  '</div>'+
  '<div class="u-d-flex u-items-center u-justify-between u-gap-12 u-m-16-0-18 u-flex-wrap">'+
    '<div class="proj-search-wrap u-flex-1">'+
      '<svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'+
      '<input type="text" id="libSearchInp" class="proj-search-inp" placeholder="Search by document name, project, type..." value="'+esc(LIB_SEARCH)+'" data-inp="libSearch" autocomplete="off" aria-label="Search by document name">'+
      '<button type="button" id="libSearchClear" class="proj-search-clear" data-act="clearLibSearch" title="Clear search" style="'+(LIB_SEARCH?'display:block':'display:none')+'">&times;</button>'+
    '</div>'+
    '<span id="libSearchMeta" class="small muted">'+(LIB_SEARCH?'Showing <b>'+matchedDocs.length+'</b> of '+allApproved.length:allApproved.length+' '+(allApproved.length===1?'document':'documents'))+'</span>'+
  '</div>'+
  '<div id="libTableView">'+
    renderDocumentLibraryTable()+
  '</div>';
});
ACT.uploadDoc=el=>{
  const tenderPreselect=el?el.dataset.tender:null;
  const tList=S.tenders.filter(t=>!t.manual);
  const PAST="past";
  const defaultTender=tenderPreselect||(tList[0]?tList[0].id:PAST);

  const tenderOptions=(tList.length?'<optgroup label="Current tenders">'+tList.map(t=>{
    const sp=spOf(t);
    const label=t.code+" — "+t.title+(sp?" ("+sp.name+")":"");
    return '<option value="'+esc(t.id)+'"'+(t.id===defaultTender?' selected':'')+'>'+esc(label)+'</option>';
  }).join("")+'</optgroup>':'')+
  '<option value="'+PAST+'"'+(defaultTender===PAST?' selected':'')+'>A past project (not in this workspace)</option>';

  /* Suggestions from past projects already in the library */
  const pastSps={};
  S.docs.forEach(d=>{if(d.past&&d.past.project){const k=d.past.project;pastSps[k]=pastSps[k]||new Set();if(d.past.sp)pastSps[k].add(d.past.sp);}});
  const dlOpts=list=>[...list].sort().map(x=>'<option value="'+esc(x)+'"></option>').join("");
  const allPastSps=new Set(Object.values(pastSps).flatMap(s=>[...s]));

  openModal({
    title:"Upload document to library",
    wide:true,
    submit:"Upload document",
    body:
      '<div class="field u-mb-16">'+
        '<label>File attachment <span class="req">*</span></label>'+
        '<div id="upDropBox" class="u-border-2-dashed-border u-rounded-8 u-p-22 u-text-center u-bg-bg-card u-cursor-pointer u-pos-relative u-transition-border-color">'+
          '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="u-mb-8 u-text-muted"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>'+
          '<div id="upDropTitle" class="u-fw-600 u-mb-4">Click to select a file or drag &amp; drop</div>'+
          '<div id="upDropSub" class="small muted">Supported formats: PDF, Word (DOCX), Excel (XLSX), CAD (DWG), ZIP (up to 50 MB)</div>'+
          '<input type="file" name="file" id="upFileInput" accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.txt,.zip" class="u-pos-absolute u-inset-0 u-opacity-0 u-cursor-pointer u-w-full u-h-full">'+
        '</div>'+
      '</div>'+
      '<div class="row u-gap-12">'+
        '<div class="field u-flex-2">'+
          '<label for="upTender">Record under <span class="req">*</span></label>'+
          '<select name="tenderId" id="upTender" required>'+tenderOptions+'</select>'+
        '</div>'+
        '<div class="field u-flex-1">'+
          '<label for="upSpec">Specification type</label>'+
          '<select name="spec" id="upSpec">'+
            '<option value="Particular">Particular specification</option>'+
            '<option value="General">General specification</option>'+
          '</select>'+
        '</div>'+
      '</div>'+
      '<div class="row" id="upPastFields" style="gap:12px;'+(defaultTender===PAST?'':'display:none')+'">'+
        '<div class="field u-flex-1">'+
          '<label for="upPastProj">Master project <span class="req">*</span></label>'+
          '<input type="text" name="pastProject" id="upPastProj" list="upPastProjList" placeholder="e.g. Northshore Rail Extension" autocomplete="off">'+
          '<datalist id="upPastProjList">'+dlOpts(Object.keys(pastSps))+'</datalist>'+
        '</div>'+
        '<div class="field u-flex-1">'+
          '<label for="upPastSp">Sub-project</label>'+
          '<input type="text" name="pastSp" id="upPastSp" list="upPastSpList" placeholder="e.g. Civil works" autocomplete="off">'+
          '<datalist id="upPastSpList">'+dlOpts(allPastSps)+'</datalist>'+
        '</div>'+
      '</div>'+
      '<div class="field">'+
        '<label for="upDocName">Document title <span class="req">*</span></label>'+
        '<input type="text" name="name" id="upDocName" placeholder="e.g. As-Built Civil Alignment Drawings" required>'+
      '</div>'+
      '',
    onSubmit:(fd,formEl)=>{
      const tenderId=fd.get("tenderId");
      const name=fd.get("name")?fd.get("name").trim():"";
      if(!name)return "Please enter a document title.";
      const isPast=tenderId===PAST;
      const t=isPast?null:T(tenderId);
      if(!isPast&&!t)return "Choose a tender or a past project.";
      const pastProject=isPast?(fd.get("pastProject")||"").trim():"";
      const pastSp=isPast?(fd.get("pastSp")||"").trim():"";
      if(isPast&&!pastProject)return "Enter the master project this document belongs to.";

      const fileInput=formEl.querySelector("#upFileInput");
      const file=fileInput&&fileInput.files&&fileInput.files[0];
      const fileName=file?file.name:(name.replace(/[^a-zA-Z0-9_.-]/g,"_")+".pdf");
      const fileSize=file?(file.size>1048576?(file.size/1048576).toFixed(1)+" MB":Math.max(1,Math.round(file.size/1024))+" KB"):"210 KB";
      const spec=fd.get("spec")||"Particular";
      const audience=fd.get("audience")||"Tenderers";
      const ver=fd.get("version")?fd.get("version").trim():"v1.0";
      const now=Date.now();
      const ext=(fileName.split('.').pop()||'FILE').toUpperCase();

      const docId=uid("d");
      const docHtml='<div class="file-view" style="padding:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;margin-bottom:20px">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px">'+
          '<div style="display:flex;align-items:center;gap:14px">'+
            '<div style="width:46px;height:46px;border-radius:6px;background:var(--b);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;letter-spacing:0.5px">'+
              esc(ext)+
            '</div>'+
            '<div>'+
              '<div style="font-weight:600;font-size:15px">'+esc(fileName)+'</div>'+
              '<div class="small muted">'+fileSize+' &middot; '+esc(ver)+' &middot; Uploaded '+fmtDT(now)+' by '+uname(S.me)+'</div>'+
            '</div>'+
          '</div>'+
          '<button class="btn sm sec" type="button" data-act="downloadDocFile" data-id="'+docId+'">Download file</button>'+
        '</div>'+
      '</div>'+
      '<h3>Document Overview</h3>'+
      '<p>This document was uploaded and recorded in the Document Library as an approved post-tender document by <b>'+uname(S.me)+'</b> ('+(ROLE_OF[S.me]||'User')+').</p>';

      const d={
        id:docId,
        tenderId:t?t.id:null,
        past:isPast?{project:pastProject,sp:pastSp,tender:""}:undefined,
        catId:null,
        name:name,
        spec:spec,
        audience:audience,
        ownerId:S.me,
        due:now,
        status:DS.AP,
        html:docHtml,
        versions:[{
          no:1,
          label:ver,
          html:docHtml,
          at:now,
          by:S.me,
          note:"Uploaded by "+uname(S.me),
          fileName:fileName,
          fileSize:fileSize
        }],
        comments:[],
        approvals:[{
          versionNo:1,
          approverId:S.me,
          decision:"Approved",
          remarks:"Recorded directly in library by "+uname(S.me),
          at:now
        }],
        remarks:null,
        contractsFlag:null,
        fileName:fileName,
        fileSize:fileSize,
        uploaded:true,
        createdAt:now,
        updatedAt:now,
        updatedBy:S.me
      };

      S.docs.push(d);
      log(t,"uploaded approved document '"+name+"' ("+fileName+") to Document Library",d.id);
      save();
      rerender();
      toast("Document '"+name+"' uploaded and recorded in Document library");
    }
  });

  const tenderSel=M.querySelector("#upTender"),pastBox=M.querySelector("#upPastFields");
  if(tenderSel&&pastBox)tenderSel.onchange=()=>{pastBox.style.display=tenderSel.value===PAST?"":"none";};
  const projInp=M.querySelector("#upPastProj"),spList=M.querySelector("#upPastSpList");
  if(projInp&&spList)projInp.oninput=()=>{const s=pastSps[projInp.value.trim()];spList.innerHTML=dlOpts(s||allPastSps);};
  const fileInput=M.querySelector("#upFileInput");
  const dropBox=M.querySelector("#upDropBox");
  if(dropBox&&fileInput){
    dropBox.ondragover=e=>{e.preventDefault();dropBox.style.borderColor="var(--ink)";};
    dropBox.ondragleave=e=>{e.preventDefault();dropBox.style.borderColor="var(--border)";};
    dropBox.ondrop=e=>{
      e.preventDefault();
      dropBox.style.borderColor="var(--border)";
      if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length){
        fileInput.files=e.dataTransfer.files;
        fileInput.dispatchEvent(new Event("change"));
      }
    };
  }
  if(fileInput){
    fileInput.onchange=()=>{
      if(fileInput.files&&fileInput.files[0]){
        const file=fileInput.files[0];
        const titleEl=M.querySelector("#upDropTitle");
        const subEl=M.querySelector("#upDropSub");
        const nameInput=M.querySelector("#upDocName");
        const sizeStr=file.size>1048576?(file.size/1048576).toFixed(1)+' MB':Math.max(1,Math.round(file.size/1024))+' KB';
        if(titleEl)titleEl.innerHTML='<b>'+esc(file.name)+'</b> ('+sizeStr+')';
        if(subEl)subEl.textContent='File attached. Click or drag to replace.';
        if(nameInput&&!nameInput.value.trim()){
          nameInput.value=file.name.replace(/\.[^/.]+$/,"").replace(/[-_]+/g," ");
        }
      }
    };
  }
};
