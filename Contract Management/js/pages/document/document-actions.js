/* Document actions: edit, delete, comments, approvals and download. */
import { log, notify } from "../../core/activity.js";
import { DOC_LOCKED, DS, isApproved } from "../../core/constants.js";
import { D, T, U, docsOf, me, pkgOf, reqDocs, spOf, touchDoc } from "../../core/model.js";
import { isCR, isMember } from "../../core/permissions.js";
import { ACT } from "../../core/registry.js";
import { go, rerender } from "../../core/router.js";
import { S, save, uid } from "../../core/store.js";
import { saveFile, slug } from "../../features/export/documents.js";
import { snapshot } from "./document-page.js";
import { openModal, toast } from "../../ui/feedback.js";
import { esc, fmtDT, fromISO, toISO, uname } from "../../ui/format.js";
import { fld, opts } from "../../ui/markup.js";
import { sanitize } from "../../ui/sanitize.js";

ACT.editDoc=el=>{const d=D(el.dataset.id),t=T(d.tenderId);if(DOC_LOCKED.includes(d.status)){openModal({title:"Can't edit "+d.name,submit:null,body:'<p>'+esc(d.name)+' is '+esc(d.status.toLowerCase())+'. Details can only be edited before the document is sent for approval.</p>'});return;}openModal({title:"Edit "+d.name,submit:"Save changes",body:fld("Document name",'<input type="text" name="n" id="ed1" value="'+esc(d.name)+'">',"ed1")+
  '<div class="row"><div class="field u-flex-1"><label for="ed2">Spec type</label><select name="s" id="ed2">'+opts(["General","Particular"].map(x=>({v:x,l:x})),d.spec)+'</select></div><div class="field u-flex-1"><label for="ed4">Due date</label><input type="date" name="due" id="ed4" value="'+(d.due?toISO(d.due):"")+'"></div></div>',
  onSubmit:fd=>{const n=fd.get("n").trim();if(!n)return "Enter a document name.";if(t&&docsOf(t).some(x=>x!==d&&x.name.toLowerCase()===n.toLowerCase()))return "This tender already has a document with that name.";
   d.name=n;d.spec=fd.get("s");d.due=fromISO(fd.get("due"));touchDoc(d);log(t,"edited the details of "+d.name,d.id);rerender();toast("Document details saved");}});};
ACT.delDoc=el=>{const d=D(el.dataset.id),t=T(d.tenderId),p=t?pkgOf(t):null,inPkg=p&&p.items.some(i=>i.docId===d.id);
  if(DOC_LOCKED.includes(d.status)||inPkg){openModal({title:"Can't delete "+d.name,submit:null,body:'<p>'+esc(d.name)+' is '+esc(d.status.toLowerCase())+(inPkg?" and part of the tender package":"")+'. Only documents that haven\'t been sent for approval can be deleted.</p>'});return;}
  openModal({title:"Delete "+d.name+"?",danger:true,submit:"Delete document",body:'<p>This permanently removes '+esc(d.name)+' and its comments and versions from '+(t?esc(t.code):'the Document library')+'.</p>',onSubmit:()=>{
   if(t)notify([t.icId],me().name+" deleted "+d.name+" from "+t.code,"#/tender/"+t.id+"/documents");log(t,"deleted "+d.name);S.notes=S.notes.filter(x=>x.link!=="#/doc/"+d.id);S.docs=S.docs.filter(x=>x!==d);
   save();toast(d.name+" deleted");go(t?"#/tender/"+t.id+"/documents":"#/library");}});};
ACT.addComment=el=>{const d=D(el.dataset.id);openModal({title:"Comment on "+d.name,body:fld("Comment",'<textarea name="c" id="cmT"></textarea>',"cmT"),submit:"Post comment",onSubmit:fd=>{
  const text=fd.get("c").trim();if(!text)return "Write a comment first.";const t=T(d.tenderId),cr=isCR(me())&&!isMember(me(),spOf(t));
  d.comments.push({id:uid("cm"),by:S.me,at:Date.now(),text,resolved:false,replies:[],contracts:cr});touchDoc(d);
  notify([d.ownerId],me().name+" commented on "+d.name,"#/doc/"+d.id,"comments:"+d.id);log(t,"commented on "+d.name,d.id);rerender();toast("Comment posted");}});};
ACT.reply=el=>{const d=D(el.dataset.id),c=d.comments.find(x=>x.id===el.dataset.c);openModal({title:"Reply to "+U(c.by).name,body:'<div class="cmt u-pt-0"><p>'+esc(c.text)+'</p></div>'+fld("Reply",'<textarea name="r" id="rpT"></textarea>',"rpT"),submit:"Post reply",onSubmit:fd=>{
  const r=fd.get("r").trim();if(!r)return "Write a reply first.";c.replies.push({by:S.me,at:Date.now(),text:r});touchDoc(d);notify([c.by,...c.replies.map(x=>x.by),d.ownerId],me().name+" replied on "+d.name,"#/doc/"+d.id);rerender();}});};
ACT.resolve=el=>{const d=D(el.dataset.id),c=d.comments.find(x=>x.id===el.dataset.c),t=T(d.tenderId);c.resolved=true;touchDoc(d);notify([c.by],me().name+" resolved your comment on "+d.name,"#/doc/"+d.id);log(t,"resolved a comment on "+d.name,d.id);rerender();toast("Comment resolved");};
ACT.sendApproval=el=>{const d=D(el.dataset.id),t=T(d.tenderId),meU=me(),pick=!meU.superiorId;let sup=U(meU.superiorId);
  const approvers=S.users.filter(x=>x.status==="Active"&&x.id!==meU.id&&x.role==="SME superior");
  const pickFld=pick?fld("Approver",'<select name="sup" id="apSup" required><option value="">Choose who approves your documents</option>'+approvers.map(x=>'<option value="'+x.id+'">'+esc(x.name+(x.title?", "+x.title:""))+'</option>').join("")+'</select>',"apSup")+'<p class="small muted">They will approve your documents from now on.</p>':"";
  const wasReturned=d.status===DS.RT||!!d.remarks||d.approvals.some(a=>a.decision==="Returned");
  const modalTitle=wasReturned?"Resubmit "+d.name+" for approval?":"Send "+d.name+" for approval?";
  const modalBody=wasReturned?
    (pick?'<p>Resubmit your revised version of <b>'+esc(d.name)+'</b> for review. The version will be locked until they decide.</p>':'<p>Resubmit your revised version of <b>'+esc(d.name)+'</b> to <b>'+esc(sup.name)+'</b> for review. The version will be locked until they decide.</p>')+pickFld:
    (pick?'<p>'+esc(d.name)+' goes for approval. The version is locked until they decide.</p>':'<p>'+esc(d.name)+' goes to <b>'+esc(sup.name)+'</b> for approval. The version is locked until they decide.</p>')+pickFld;
  const submitLabel=wasReturned?"Resubmit for approval":"Send for approval";
  openModal({title:modalTitle,body:modalBody,submit:submitLabel,onSubmit:fd=>{
   if(pick){const id=fd.get("sup");if(!id)return "Choose who should approve this document.";meU.superiorId=id;sup=U(id);}
   const ed=document.getElementById("editor");if(ed){d.html=sanitize(ed.innerHTML);d.updatedAt=Date.now();d.updatedBy=S.me;}
   snapshot(d,wasReturned?"Resubmitted with revisions":"Sent for approval");d.status=DS.PA;d.remarks=null;touchDoc(d);
   log(t,(wasReturned?"resubmitted revised ":"sent ")+d.name+" for approval",d.id);
   notify([sup.id],me().name+(wasReturned?" resubmitted revised ":" sent ")+d.name+" for approval (review again)","#/doc/"+d.id,"approve:"+d.id);
   if(t.icId&&t.icId!==sup.id&&t.icId!==d.ownerId)notify([t.icId],me().name+(wasReturned?" resubmitted revised ":" sent ")+d.name+" on "+t.code+" for approval","#/doc/"+d.id);
   save();rerender();toast(d.name+(wasReturned?" resubmitted to ":" sent to ")+sup.name+" for review");}});};
ACT.withdrawApproval=el=>{
  const d=D(el.dataset.id),t=T(d.tenderId);
  openModal({
    title:"Withdraw "+d.name+" to drafting?",
    body:'<p>This withdraws the approval request from '+(U(d.ownerId).superiorId?'<b>'+uname(U(d.ownerId).superiorId)+'</b>':'your reviewer')+' and returns the document to <b>Drafting</b>.</p>',
    submit:"Withdraw to drafting",
    onSubmit:()=>{
      d.status=DS.DR;
      touchDoc(d);
      log(t,"withdrew "+d.name+" back to drafting",d.id);
      save();
      rerender();
      toast(d.name+" withdrawn to drafting");
    }
  });
};
ACT.restoreDocVer=el=>{
  const d=D(el.dataset.id);
  const vNo=parseInt(el.dataset.v,10);
  const target=(d.versions||[]).find(x=>x.no===vNo);
  if(!target)return;
  openModal({
    title:"Restore Version "+target.no+"?",
    body:'<p>Are you sure you want to restore <b>Version '+target.no+'</b> (saved '+fmtDT(target.at)+' by '+uname(target.by)+')?</p>'+
      ''+
      '<div class="u-max-h-160 u-overflow-y-auto u-border-1-solid-rule u-p-10 u-rounded-6 u-bg-sunk u-fs-13 u-mt-10">'+target.html+'</div>',
    submit:"Restore version",
    onSubmit:()=>{
      d.html=target.html;
      d.updatedAt=Date.now();
      d.updatedBy=S.me;
      snapshot(d,"Restored to version "+target.no);
      touchDoc(d);
      save();
      rerender();
      toast("Restored to version "+target.no);
    }
  });
};
ACT.approve=el=>{const d=D(el.dataset.id),t=T(d.tenderId);openModal({title:"Approve "+d.name+"?",body:'<p>Version '+d.versions.length+' will be recorded as approved by you and can be collated into the tender package.</p>',submit:"Approve",onSubmit:()=>{
  d.status=DS.AP;d.approvals.push({versionNo:d.versions.length,approverId:S.me,decision:"Approved",remarks:"",at:Date.now()});d.remarks=null;touchDoc(d);log(t,"approved "+d.name,d.id);notify([d.ownerId,t.icId],me().name+" approved "+d.name+" on "+t.code,"#/doc/"+d.id);
  const ds=reqDocs(t),p=pkgOf(t);
  if(!p&&ds.length&&ds.every(isApproved)){
    const sp=spOf(t);
    const link=sp&&sp.projectId?"#/search/"+sp.projectId+"/"+sp.id+"/"+t.id:"#/tender/"+t.id+"/documents";
    notify([t.icId],"All documents for "+t.code+" are approved and ready to collate",link,"collate:"+t.id);
    log(t,"all required documents approved — ready to collate package");
  }
  save();rerender();toast(d.name+" approved");}});};
ACT.returnDoc=el=>{const d=D(el.dataset.id),t=T(d.tenderId);openModal({title:"Return "+d.name+" back for revision",body:fld("Remarks for "+U(d.ownerId).name,'<textarea name="r" id="rt1" placeholder="What needs to change before you approve" required></textarea>',"rt1")+'',submit:"Return back",danger:true,onSubmit:fd=>{
  const r=fd.get("r").trim();if(!r)return "Add remarks so the SME knows what to change.";d.status=DS.RT;d.remarks=r;d.approvals.push({versionNo:d.versions.length,approverId:S.me,decision:"Returned",remarks:r,at:Date.now()});touchDoc(d);
  log(t,"returned "+d.name+" with remarks",d.id);notify([d.ownerId],me().name+' returned '+d.name+' for revision: "'+r+'". Please revise and send back for review.',"#/doc/"+d.id,"own:"+d.id);
  if(t.icId&&t.icId!==d.ownerId)notify([t.icId],me().name+' returned '+d.name+' on '+t.code+' for revision: "'+r+'"',"#/doc/"+d.id);
  save();rerender();toast(d.name+" returned to "+U(d.ownerId).name+" for revision");}});};
ACT.downloadDocFile=async el=>{
  const d=D(el.dataset.id);
  if(!d)return;
  const fileName=d.fileName?d.fileName:(slug(d.name)+".html");
  const blob=new Blob([d.html||"Approved document record"],{type:d.fileName?"application/octet-stream":"text/html"});
  await saveFile(fileName,blob);
};
