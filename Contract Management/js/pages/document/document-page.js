/* Document page and its rich-text editor. */
import { log } from "../../core/activity.js";
import { DOC_LOCKED, DS } from "../../core/constants.js";
import { D, T, lastUpd, me, pkgOf } from "../../core/model.js";
import { canComment, canEditDoc, canSeeDoc, canSeeTender, isSuperiorOf, isTEC } from "../../core/permissions.js";
import { ACT, ROUTES, route } from "../../core/registry.js";
import { afterRender, denied } from "../../core/router.js";
import { S, save } from "../../core/store.js";
import { has, refreshActs } from "../../core/tasks.js";
import { renderNav } from "../../layout/sidebar.js";
import { docOriginRows, docRemarkRows } from "./document-details.js";
import { feed } from "../../ui/activity-feed.js";
import { docBreadcrumbs } from "../../ui/breadcrumbs.js";
import { toast } from "../../ui/feedback.js";
import { esc, fmtD, fmtDT, rel, uname } from "../../ui/format.js";
import { adot, badge, dA, dSR } from "../../ui/markup.js";
import { sanitize } from "../../ui/sanitize.js";

export function snapshot(d,note){const last=d.versions.slice(-1)[0];if(!last||last.html!==d.html)d.versions.push({no:d.versions.length+1,html:d.html,at:Date.now(),by:S.me,note});else{last.note=note;last.at=Date.now();}return d.versions.length;}
export function docActivity(d){const acts=S.activity.filter(a=>a.docId===d.id);
  const extra=d.approvals.filter(ap=>!acts.some(a=>a.by===ap.approverId&&Math.abs(a.at-ap.at)<60000&&/approved|returned/.test(a.text))).map(ap=>({at:ap.at,by:ap.approverId,text:(ap.decision==="Approved"?"approved ":"returned ")+d.name+(ap.remarks?": "+ap.remarks:""),docId:d.id,tenderId:d.tenderId}));
  return acts.map(a=>Object.assign({},a,{docId:d.id,tenderId:d.tenderId})).concat(extra);}
export function docActs(d){const u=me(),owner=d.ownerId===u.id,sup=d.status===DS.PA&&isSuperiorOf(u,d.ownerId);
  const isLib=d.status===DS.AP||d.status===DS.FI;
  let acts="";
  acts+='<button class="btn sec" data-act="downloadDocFile" data-id="'+d.id+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="u-mr-6 u-va-n2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>Download'+(d.fileName?' '+esc((d.fileName.split('.').pop()||'').toUpperCase()):'')+'</button>';
  if(owner){
    if([DS.NS,DS.DR,DS.RT,DS.IR].includes(d.status)){
      const sd=has("own:"+d.id)||has("publish:"+d.id);
      const wasReturned=d.status===DS.RT||!!d.remarks||d.approvals.some(a=>a.decision==="Returned");
      const btnLabel=wasReturned?"Resubmit for approval":"Send for approval";
      acts+='<button class="btn" data-act="sendApproval" data-id="'+d.id+'"'+dA(sd)+'>'+btnLabel+dSR(sd)+'</button>';
    }
    if(d.status===DS.PA){
      acts+='<button class="btn sec" data-act="withdrawApproval" data-id="'+d.id+'" title="Withdraw and go back to drafting"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="u-mr-6 u-va-n2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>Withdraw to drafting</button>';
    }
  }
  if((owner||isLib)&&!DOC_LOCKED.includes(d.status))acts+='<button class="btn ghost" data-act="delDoc" data-id="'+d.id+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="u-mr-6 u-va-n2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>Delete</button>';
  if((owner||isLib)&&!DOC_LOCKED.includes(d.status))acts+='<button class="btn ghost" data-act="editDoc" data-id="'+d.id+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="u-mr-6 u-va-n2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Edit</button>';
  if(sup)acts+='<button class="btn warn" data-act="returnDoc" data-id="'+d.id+'">Return back</button><button class="btn" data-act="approve" data-id="'+d.id+'"'+dA(has("approve:"+d.id))+'>Approve'+dSR(has("approve:"+d.id))+'</button>';
  return acts;}
route("doc",id=>{const d=D(id),u=me();if(!d)return denied("This document doesn't exist.");
  const t=T(d.tenderId);if(!canSeeDoc(u,d)&&canSeeTender(u,t))return denied("This document hasn't been published yet. It becomes visible to the tender team when its owner publishes it.");if(!canSeeDoc(u,d)){if(isTEC(u,t)&&pkgOf(t)&&pkgOf(t).submittedAt)return ROUTES.tec(pkgOf(t).id);return denied("You don't have access to this document.");}
  const owner=d.ownerId===u.id,edit=canEditDoc(u,d),cm=canComment(u,d);
  const body=edit?'<div class="doc"><div class="doc-tools" role="toolbar" aria-label="Formatting"><button type="button" data-act="fmt" data-c="formatBlock" data-v="h3">Heading</button><button type="button" data-act="fmt" data-c="formatBlock" data-v="p">Paragraph</button><button type="button" data-act="fmt" data-c="bold"><b>B</b></button><button type="button" data-act="fmt" data-c="italic"><i>I</i></button><button type="button" data-act="fmt" data-c="insertOrderedList">Numbered</button><button type="button" data-act="fmt" data-c="insertUnorderedList">Bullets</button><span class="u-w-1 u-h-16 u-bg-rule u-m-0-4 u-d-inline-block u-va-middle"></span><button type="button" class="btn-ai-write" data-act="aiWriteAssist" data-id="'+d.id+'" title="AI to help with writing document"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="u-mr-4 u-va-n1"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"></path></svg>Write with AI</button><div class="u-ml-auto u-d-inline-flex u-items-center u-gap-10"><span class="saved" id="savedState">All changes saved</span><button type="button" class="btn-save" id="btnSaveDoc" data-act="saveDocContent" data-id="'+d.id+'" title="Save document changes (Cmd+S / Ctrl+S)" disabled><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>Save</button></div></div><div class="doc-body" id="editor" contenteditable="true" spellcheck="true" aria-label="Document content">'+d.html+'</div></div>'
    :'<div class="doc"><div class="doc-tools"><span class="saved u-ml-0">Read-only</span></div><div class="doc-body" id="reader">'+d.html+'</div></div>';
  const cms=d.comments.slice().sort((a,b)=>(a.resolved-b.resolved)||(b.at-a.at));
  const cmHtml=cms.map(c=>'<div class="cmt'+(c.resolved?" resolved":"")+'"><div class="by">'+uname(c.by)+'<span class="at">'+rel(c.at)+'</span>'+(c.contracts?' <span class="tag">Contracts review</span>':"")+(c.resolved?' <span class="tag">Resolved</span>':"")+'</div><p>'+esc(c.text)+'</p>'+
    c.replies.map(r=>'<div class="rep"><div class="by">'+uname(r.by)+'<span class="at">'+rel(r.at)+'</span></div><p>'+esc(r.text)+'</p></div>').join("")+
    (!c.resolved&&(cm||owner)?'<div class="row u-mt-6"><button class="link small" data-act="reply" data-id="'+d.id+'" data-c="'+c.id+'">Reply</button>'+(owner?'<button class="link small" data-act="resolve" data-id="'+d.id+'" data-c="'+c.id+'">Resolve</button>':"")+'</div>':"")+'</div>').join("");
  if(!d.versions||!d.versions.length){
    d.versions=[{no:1,html:d.html,at:d.createdAt||Date.now(),by:d.ownerId||S.me,note:"Initial draft"}];
  }
  const curVerNo=d.versions[d.versions.length-1].no;
  const versHtml=d.versions.slice().reverse().map(v=>{
    const isCur=v.no===curVerNo;
    const canRestore=edit&&!isCur&&!DOC_LOCKED.includes(d.status);
    return '<li class="u-d-flex u-items-center u-justify-between u-gap-8 u-p-7-0 u-border-b-1-solid-rule">'+
      '<div><div class="u-fw-600 u-fs-13">Version '+v.no+(isCur?' <span class="badge g u-fs-11 u-p-0-5 u-ml-4">Current</span>':'')+'</div>'+
      '<div class="small muted">'+fmtDT(v.at)+' by '+uname(v.by)+(v.note?' &middot; '+esc(v.note):'')+'</div></div>'+
      (canRestore?'<button type="button" class="btn sec sm u-p-2-8 u-fs-12" data-act="restoreDocVer" data-id="'+d.id+'" data-v="'+v.no+'" title="Restore this version">Restore</button>':'')+
    '</li>';
  }).join("");
  afterRender.push(()=>bindEditor(d));
  const isLib=d.status===DS.AP||d.status===DS.FI;
  return docBreadcrumbs(d, t)+
  '<div class="head"><div><h1>'+esc(d.name)+'</h1></div><div class="acts">'+docActs(d)+'</div></div>'+
  '<div class="grid2"><div>'+body+'</div>'+
  '<div><div class="panel"><h3>Document details</h3><dl class="kv">'+docOriginRows(d,t)+'<dt>Spec type</dt><dd>'+esc(d.spec)+'</dd>'+docRemarkRows(d)+(d.fileName?'<dt>Attached file</dt><dd><b>'+esc(d.fileName)+'</b> <span class="muted small">('+(d.fileSize||'142 KB')+')</span></dd>':"")+'<dt>Owner</dt><dd>'+(d.ownerId?uname(d.ownerId):"Unassigned")+'</dd>'+(isLib?'':'<dt>Due date</dt><dd>'+fmtD(d.due)+'</dd><dt>Status</dt><dd>'+badge(d.status)+'</dd>')+'<dt>Created</dt><dd>'+(d.createdAt?fmtD(d.createdAt):'–')+'</dd><dt>Last updated</dt><dd>'+(lastUpd(d).at?fmtDT(lastUpd(d).at)+(lastUpd(d).by?' by '+uname(lastUpd(d).by):''):'–')+'</dd></dl></div>'+
  '<div class="panel"><div class="row u-justify-between"><h3 class="u-m-0">Version history</h3><span class="muted small">'+d.versions.length+(d.versions.length===1?' version':' versions')+'</span></div><ul class="u-list-none u-p-0 u-m-8-0-0">'+(versHtml||'<li class="small muted">Version 1</li>')+'</ul></div>'+
  '<div class="panel"><div class="row u-justify-between"><h3 class="u-m-0">Comments'+adot(has("comments:"+d.id))+''+(d.comments.some(c=>!c.resolved)?' <span class="muted small">'+d.comments.filter(c=>!c.resolved).length+' open</span>':'')+'</h3>'+(cm?'<button class="btn sec sm" data-act="addComment" data-id="'+d.id+'">Add comment</button>':"")+'</div>'+(cmHtml||'<p class="muted small u-mt-10">No comments yet.</p>')+'</div>'+
  '<div class="panel"><h3>Activity</h3>'+feed(docActivity(d))+'</div></div></div>';});
function doSaveDoc(d){
  const ed=document.getElementById("editor");if(!ed)return;
  const st=document.getElementById("savedState");
  const btn=document.getElementById("btnSaveDoc");
  d.html=sanitize(ed.innerHTML);
  d.updatedAt=Date.now();
  d.updatedBy=S.me;
  if(!d.versions||!d.versions.length){
    d.versions=[{no:1,html:d.html,at:d.createdAt||Date.now(),by:d.ownerId||S.me,note:"Initial draft"}];
  }
  snapshot(d,"Draft revision");
  const t=T(d.tenderId);
  if(d.status===DS.NS||d.status===DS.RT){
    const from=d.status;
    d.status=DS.DR;
    log(t,(from===DS.RT?"started revising ":"started drafting ")+d.name,d.id);
    refreshActs();
    const ac=document.querySelector("main .head .acts");
    if(ac)ac.innerHTML=docActs(d);
    renderNav();
  }
  save();
  if(st){
    const timeStr=new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    st.innerHTML='<span class="u-text-g-fg u-fw-600">✓ Saved '+timeStr+'</span>';
  }
  if(btn)btn.setAttribute("disabled","true");
  toast("Document saved");
}
export function bindEditor(d){
  const ed=document.getElementById("editor");if(!ed)return;
  const st=document.getElementById("savedState");
  const btn=document.getElementById("btnSaveDoc");
  const onEdit=()=>{
    if(st)st.innerHTML='<span class="u-text-w-fg u-fw-600">● Unsaved changes</span>';
    if(btn)btn.removeAttribute("disabled");
  };
  ed.addEventListener("input",onEdit);
  ed.addEventListener("keydown",e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="s"){
      e.preventDefault();
      doSaveDoc(d);
    }
  });
}
ACT.saveDocContent=el=>{const d=D(el.dataset.id);if(d)doSaveDoc(d);};
ACT.fmt=el=>{const ed=document.getElementById("editor");ed.focus();document.execCommand(el.dataset.c,false,el.dataset.v||null);ed.dispatchEvent(new Event("input"));};
